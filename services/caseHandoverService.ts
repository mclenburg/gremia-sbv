import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type { CreatePersonalDataAuditInput } from '../src/domain/models/audit.model.js';
import { auditCaseHandoverContinuedAfterExpiry, auditCaseHandoverExported, auditCaseHandoverImported, auditCaseHandoverImportInspected } from './auditEventBuilders.js';
import { SearchIndexService } from './search/searchIndexService.js';
import { buildCandidateMatches, buildCaseHandoverImportPlan, CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION, isExpired, safeAuditMetadata } from './caseHandoverPolicy.js';
import { assertCaseHandoverEnvelope, decryptCaseHandoverEnvelope, type CaseHandoverEnvelope } from './caseHandoverCrypto.js';
import { encryptCaseHandoverPayloadForRecipient } from './caseHandoverTargetCrypto.js';
import { inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { TransferInstanceIdentityService, type TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import type { CaseHandoverCockpit, CaseHandoverContinueExpiredInput, CaseHandoverContinueExpiredResult, CaseHandoverExportInput, CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverInspectResult, CaseHandoverReturnDeltaExportInput } from '../src/domain/models/case-handover.model.js';
import { Row, PackagePayload, DecryptedPackage, nowIso, isRecord, safeString } from './caseHandoverSupport.js';
import { collectCaseHandoverPayload } from './caseHandoverPayloadCollector.js';
import { ensureCaseHandoverExportLedgerSchema, recordCaseHandoverExport } from './caseHandoverExportLedger.js';
import { CaseHandoverReturnDeltaService } from './caseHandoverReturnDeltaService.js';
import { CaseHandoverCockpitService } from './caseHandoverCockpitService.js';
import { storeImportedCaseDocument } from './caseHandoverImportedDocumentStore.js';
import { OWNER_ONLY_FILE_MODE, restrictFileToOwner } from './secureFilePermissions.js';
import { ensureCaseHandoverRuntimeSchema } from './runtimeSchemaCompatibility.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import type { TransferImportPlan } from '../src/domain/models/transfer.model.js';
export class CaseHandoverService {
  constructor(private readonly database: DatabaseAdapter, private readonly dataDirProvider: () => string = () => path.join(process.cwd(), 'data')) {}

  private db(): DatabaseAdapter { return this.database; }

  ensureSchema(db: DatabaseAdapter): void {
    ensureCaseHandoverRuntimeSchema(db);
    ensureCaseHandoverExportLedgerSchema(db);
    new PersonalDataAuditLogService(db);
  }

  private audit(db: DatabaseAdapter, event: CreatePersonalDataAuditInput): void {
    new PersonalDataAuditLogService(db).append(event);
  }

  private rows(db: DatabaseAdapter, sql: string, ...params: unknown[]): Row[] { try { return db.prepare<Row>(sql).all(...params); } catch { return []; } }
  private row(db: DatabaseAdapter, sql: string, ...params: unknown[]): Row | undefined { try { return db.prepare<Row>(sql).get(...params); } catch { return undefined; } }

  private encryptPayload(payload: PackagePayload, input: CaseHandoverExportInput): CaseHandoverEnvelope {
    const recipient = parseTransferRecipientToken(input.targetRecipientToken);
    return encryptCaseHandoverPayloadForRecipient({
      payloadText: JSON.stringify(payload),
      passphrase: input.passphrase,
      packageId: payload.packageId,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
      recipient,
    });
  }

  private decryptEnvelope(envelope: CaseHandoverEnvelope, passphrase: string): DecryptedPackage {
    const decrypted = decryptCaseHandoverEnvelope(envelope, passphrase, this.localIdentityFor(envelope));
    const parsed = JSON.parse(decrypted.payloadText) as unknown;
    const payload = this.assertPayload(parsed, decrypted.formatVersion);
    if (payload.packageId !== envelope.packageId || payload.expiresAt !== envelope.expiresAt) throw new Error('Fallübergabepaket enthält widersprüchliche Metadaten.');
    return {
      payload,
      transfer: {
        formatVersion: decrypted.formatVersion,
        legacyFormat: decrypted.legacyFormat,
        algorithm: decrypted.algorithm,
      },
    };
  }

  private localIdentityFor(envelope: CaseHandoverEnvelope): TransferInstancePrivateIdentity | undefined {
    return 'crypto' in envelope && envelope.recipientBinding
      ? new TransferInstanceIdentityService(this.database).getPrivateIdentity()
      : undefined;
  }

  private readEnvelope(filePath: string): CaseHandoverEnvelope {
    const file = inspectCaseHandoverFilePath(filePath);
    return assertCaseHandoverEnvelope(JSON.parse(fs.readFileSync(file.filePath, 'utf8')));
  }

  private buildImportPlanning(db: DatabaseAdapter, payload: PackagePayload) {
    const firstCase = payload.cases[0]?.data;
    const firstPersonId = firstCase?.protected_person_id;
    const person = payload.protectedPersons.find((entry) => entry.data.id === firstPersonId)?.data;
    const localCases = this.rows(db, `SELECT c.id, c.case_number, c.display_name, p.first_name AS protected_first_name, p.last_name AS protected_last_name FROM cases c LEFT JOIN protected_persons p ON p.id = c.protected_person_id`) as Array<{ id: string; case_number?: string; display_name?: string; protected_first_name?: string; protected_last_name?: string }>;
    const matches = buildCandidateMatches({
      exportedCaseNumber: this.optionalPayloadString(firstCase?.case_number),
      exportedDisplayName: this.optionalPayloadString(firstCase?.display_name),
      exportedFirstName: this.optionalPayloadString(person?.first_name),
      exportedLastName: this.optionalPayloadString(person?.last_name),
      localCases,
    });
    const expired = isExpired(payload.expiresAt);
    const importPlan = buildCaseHandoverImportPlan({
      caseCount: payload.cases.length,
      measureCount: payload.measures.length,
      documentCount: payload.documents.length,
      deadlineCount: payload.deadlines.length,
      expiresAt: payload.expiresAt,
      isExpired: expired,
      matches,
    });
    return { matches, expired, importPlan };
  }

  private assertImportAllowed(db: DatabaseAdapter, payload: PackagePayload, input: CaseHandoverImportInput, expired: boolean, importPlan: TransferImportPlan): void {
    if (expired) {
      this.audit(db, auditCaseHandoverImported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), mode: input.mode, result: 'failed', reasonCode: 'expired_transfer_package' }));
      throw new Error('Das Fallübergabepaket ist abgelaufen und darf nicht importiert werden. Bitte eine neue Übergabedatei anfordern.');
    }
    if (input.mode === 'merge_existing' && !importPlan.mergeAllowed) {
      this.audit(db, auditCaseHandoverImported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), mode: input.mode, result: 'failed', reasonCode: 'merge_conflict_review_required' }));
      throw new Error('Das Übergabepaket enthält echte Konflikte. Bitte als neue lokale Übergabeakte importieren und fachlich prüfen.');
    }
  }

  private markImportedCasesForPrivacyReview(db: DatabaseAdapter, caseIds: readonly string[], timestamp: string, priority: 'normal' | 'high'): string[] {
    const privacyReviewService = new PrivacyReviewService(db);
    privacyReviewService.ensureSchema();
    for (const caseId of caseIds) {
      const row = this.row(db, 'SELECT protected_person_id FROM cases WHERE id = ?', caseId);
      privacyReviewService.createForCase(caseId, this.optionalPayloadString(row?.protected_person_id) ?? null, 'handover_imported', { freeTextReviewRequired: true }, timestamp, priority);
    }
    return [...caseIds];
  }

  private assertPayload(value: unknown, formatVersion: number): PackagePayload {
    if (!isRecord(value)) throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
    if (value.format !== CASE_HANDOVER_FORMAT || typeof value.version !== 'number') throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
    if (value.packageId === undefined || typeof value.packageId !== 'string') throw new Error('Fallübergabepaket enthält keine gültige Paketkennung.');
    if (value.createdAt === undefined || typeof value.createdAt !== 'string') throw new Error('Fallübergabepaket enthält kein gültiges Erstellungsdatum.');
    if (value.expiresAt !== undefined && typeof value.expiresAt !== 'string') throw new Error('Fallübergabepaket enthält kein gültiges Ablaufdatum.');
    if (value.packageType !== undefined && value.packageType !== 'vacation_handover' && value.packageType !== 'return_delta') throw new Error('Fallübergabepaket enthält einen ungültigen Übergabetyp.');
    if (value.packageType === 'return_delta' && typeof value.sourcePackageId !== 'string') throw new Error('Rückgabepaket enthält keine Ausgangspaket-Zuordnung.');
    const payload = value as unknown as PackagePayload;
    const arrayFields: Array<keyof Pick<PackagePayload, 'cases' | 'protectedPersons' | 'notes' | 'measures' | 'measureNotes' | 'deadlines' | 'documents'>> = ['cases', 'protectedPersons', 'notes', 'measures', 'measureNotes', 'deadlines', 'documents'];
    for (const field of arrayFields) if (!Array.isArray(payload[field])) throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
    if (!payload.cases.length) throw new Error('Fallübergabepaket enthält keine Fallakte.');
    this.assertUniqueRefs('Fallakten', payload.cases.map((item) => item.ref));
    this.assertUniqueRefs('Personen', payload.protectedPersons.map((item) => item.ref));
    this.assertUniqueRefs('Notizen', payload.notes.map((item) => item.ref));
    this.assertUniqueRefs('Maßnahmen', payload.measures.map((item) => item.ref));
    this.assertUniqueRefs('Maßnahmennotizen', payload.measureNotes.map((item) => item.ref));
    this.assertUniqueRefs('Fristen', payload.deadlines.map((item) => item.ref));
    this.assertUniqueRefs('Dokumente', payload.documents.map((item) => item.ref));
    const caseRefs = new Set(payload.cases.map((item) => item.ref));
    const measureRefs = new Set(payload.measures.map((item) => item.ref));
    for (const item of [...payload.notes, ...payload.measures]) if (!caseRefs.has(item.caseRef)) throw new Error('Fallübergabepaket enthält ungültige Fallreferenzen.');
    for (const item of payload.measureNotes) {
      if (!caseRefs.has(item.caseRef) || !measureRefs.has(item.measureRef)) throw new Error('Fallübergabepaket enthält ungültige Maßnahmenreferenzen.');
    }
    for (const item of payload.deadlines) {
      if (item.caseRef && !caseRefs.has(item.caseRef)) throw new Error('Fallübergabepaket enthält ungültige Fristreferenzen.');
      if (item.measureRef && !measureRefs.has(item.measureRef)) throw new Error('Fallübergabepaket enthält ungültige Fristreferenzen.');
    }
    for (const item of payload.documents) {
      if (!caseRefs.has(item.caseRef)) throw new Error('Fallübergabepaket enthält ungültige Dokumentreferenzen.');
      if (item.measureRef && !measureRefs.has(item.measureRef)) throw new Error('Fallübergabepaket enthält ungültige Dokumentreferenzen.');
      if (typeof item.contentBase64 !== 'string') throw new Error('Fallübergabepaket enthält ungültige Dokumentdaten.');
      const data = item.data ?? {};
      const forbidden = ['storage_path', 'document_key', 'iv', 'auth_tag'].filter((field) => data[field] !== undefined && data[field] !== null && data[field] !== '');
      if (forbidden.length) throw new Error('Fallübergabepaket enthält lokale Dokument-Schlüsseldaten.');
      if (formatVersion >= CASE_HANDOVER_VERSION && Object.keys(data).some((field) => ['storage_path', 'document_key', 'iv', 'auth_tag'].includes(field))) {
        throw new Error('Fallübergabepaket enthält lokale Dokument-Schlüsseldaten.');
      }
    }
    return payload;
  }

  private optionalPayloadString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private assertUniqueRefs(label: string, refs: string[]): void {
    if (refs.some((ref) => typeof ref !== 'string' || !ref)) throw new Error(`${label} im Fallübergabepaket enthalten ungültige Referenzen.`);
    if (new Set(refs).size !== refs.length) throw new Error(`${label} im Fallübergabepaket enthalten doppelte Referenzen.`);
  }

  async exportToFile(input: CaseHandoverExportInput, targetPath: string): Promise<CaseHandoverExportResult> {
    const db = this.db();
    const payload = collectCaseHandoverPayload(db, input, this.dataDirProvider);
    const envelope = this.encryptPayload(payload, input);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, JSON.stringify(envelope, null, 2), { mode: OWNER_ONLY_FILE_MODE });
    await restrictFileToOwner(targetPath);
    const targetInstanceId = 'crypto' in envelope ? envelope.recipientBinding?.targetInstanceId : undefined;
    recordCaseHandoverExport(db, payload, targetInstanceId);
    this.audit(db, auditCaseHandoverExported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), result: 'success' }));
    return { exported: true, filePath: targetPath, packageId: payload.packageId, packageType: payload.packageType ?? 'vacation_handover', caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, expiresAt: payload.expiresAt, targetInstanceId };
  }

  async exportReturnDeltaToFile(input: CaseHandoverReturnDeltaExportInput, targetPath: string): Promise<CaseHandoverExportResult> {
    return new CaseHandoverReturnDeltaService(this.database, this.dataDirProvider).exportToFile(input, targetPath);
  }

  listCockpit(): CaseHandoverCockpit {
    return new CaseHandoverCockpitService(this.database).list();
  }

  inspect(filePath: string, passphrase: string): CaseHandoverInspectResult {
    const db = this.db();
    let envelope: CaseHandoverEnvelope | undefined;
    try { const file = inspectCaseHandoverFilePath(filePath); envelope = this.readEnvelope(file.filePath); const decrypted = this.decryptEnvelope(envelope, passphrase); const payload = decrypted.payload; const { matches, expired, importPlan } = this.buildImportPlanning(db, payload);
      if (expired) {
        this.audit(db, auditCaseHandoverImportInspected({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), result: 'failed', reasonCode: 'expired_transfer_package' }));
      }
      return {
        valid: true,
        packageId: payload.packageId,
        packageType: payload.packageType ?? 'vacation_handover',
        createdAt: payload.createdAt,
        expiresAt: payload.expiresAt,
        isExpired: expired,
        caseCount: payload.cases.length,
        measureCount: payload.measures.length,
        documentCount: payload.documents.length,
        deadlineCount: payload.deadlines.length,
        matches,
        importPlan,
        warnings: [
          ...file.warnings,
          ...(expired ? ['Das Übergabepaket ist abgelaufen und darf nicht mehr importiert werden. Bitte eine neue Übergabedatei anfordern.'] : []),
          ...(decrypted.transfer.legacyFormat ? ['Dieses Übergabepaket wurde mit einem älteren Schutzformat erstellt. Der Import ist möglich, für neue Übergaben sollte ein aktuelles Paket erstellt werden.'] : []),
        ],
        integrity: { verified: true, algorithm: decrypted.transfer.algorithm, formatVersion: decrypted.transfer.formatVersion, legacyFormat: decrypted.transfer.legacyFormat },
        targetInstanceId: 'crypto' in envelope ? envelope.recipientBinding?.targetInstanceId : undefined,
        file: { fileName: file.fileName, sizeBytes: file.sizeBytes, isNetworkPath: file.isNetworkPath },
      };
    } catch (error) {
      this.audit(db, auditCaseHandoverImportInspected({ packageId: envelope?.packageId, result: 'failed', reasonCode: 'invalid_passphrase_or_tampered_package' }));
      throw error;
    }
  }

  async importFromFile(input: CaseHandoverImportInput): Promise<CaseHandoverImportResult> {
    const db = this.db();
    const file = inspectCaseHandoverFilePath(input.filePath);
    const envelope = this.readEnvelope(file.filePath);
    const decrypted = this.decryptEnvelope(envelope, input.passphrase);
    const payload = decrypted.payload;
    if (payload.packageType === 'return_delta') {
      return new CaseHandoverReturnDeltaService(this.database, this.dataDirProvider).importPayload(payload, input);
    }
    const { expired, importPlan } = this.buildImportPlanning(db, payload);
    this.assertImportAllowed(db, payload, input, expired, importPlan);
    const duplicate = this.row(db, 'SELECT id FROM case_handover_imports WHERE package_id = ?', payload.packageId);
    if (duplicate) throw new Error('Dieses Fallübergabepaket wurde bereits importiert.');
    const importId = randomUUID();
    const timestamp = nowIso();
    const status = 'active';
    const caseRefToLocal = new Map<string, string>();
    const measureRefToLocal = new Map<string, string>();
    const createdCaseIds: string[] = [];
    const updatedCaseIds: string[] = [];
    const personRefToLocal = new Map<string, string>();

    db.prepare(`INSERT INTO case_handover_imports (id, package_id, imported_at, valid_until, status, mode, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(importId, payload.packageId, timestamp, payload.expiresAt ?? null, status, input.mode, JSON.stringify(safeAuditMetadata({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, hasExpiry: Boolean(payload.expiresAt), expiresAt: payload.expiresAt, mode: input.mode, result: 'success' })));

    for (const person of payload.protectedPersons) {
      const id = randomUUID();
      personRefToLocal.set(person.ref, id);
      const d = person.data;
      db.prepare(`INSERT INTO protected_persons (id, created_at, updated_at, record_kind, pseudonym_label, first_name, last_name, personnel_number, work_email, organizational_unit, location, employment_state, left_company_at, left_company_reason, protection_status, status_valid_from, status_valid_until, evidence_checked_at, status_source, lifecycle_state, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, timestamp, timestamp, d.record_kind ?? 'identified_person', d.pseudonym_label ?? null, d.first_name ?? '', d.last_name ?? '', d.personnel_number ?? null, d.work_email ?? null, d.organizational_unit ?? null, d.location ?? null, d.employment_state ?? 'unknown', d.left_company_at ?? null, d.left_company_reason ?? null, d.protection_status ?? 'unclear', d.status_valid_from ?? null, d.status_valid_until ?? null, d.evidence_checked_at ?? null, d.status_source ?? 'unknown', d.lifecycle_state ?? 'active', d.notes ?? null);
      this.insertItem(db, importId, 'protected_person', id, person.ref, timestamp);
    }

    for (const item of payload.cases) {
      const d = item.data;
      let localId = input.mode === 'merge_existing' ? input.targetCaseId : undefined;
      if (localId && !this.row(db, 'SELECT id FROM cases WHERE id = ?', localId)) throw new Error('Gewählte lokale Zielakte wurde nicht gefunden.');
      if (!localId) {
        localId = randomUUID();
        const localCaseNumber = this.uniqueCaseNumber(db, safeString(d.case_number, 'ÜBERGABE'));
        const personRef = payload.protectedPersons.find((p) => p.data.id === d.protected_person_id)?.ref;
        db.prepare(`INSERT INTO cases (id, case_number, display_name, category, status, priority, opened_at, closed_at, summary, is_pseudonymized, is_locked, created_at, updated_at, protected_person_id, person_binding_state, handover_import_id, handover_package_id, handover_valid_until, handover_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(localId, localCaseNumber, `[Übergabe] ${d.display_name ?? 'Fallakte'}`, d.category ?? 'sonstiges', d.status ?? 'offen', d.priority ?? 'normal', d.opened_at ?? timestamp, d.closed_at ?? null, d.summary ?? null, d.is_pseudonymized ?? 1, 0, timestamp, timestamp, personRef ? personRefToLocal.get(personRef) ?? null : null, d.person_binding_state ?? 'legacy_unlinked', importId, payload.packageId, payload.expiresAt ?? null, status);
        createdCaseIds.push(localId as string);
      } else {
        db.prepare(`UPDATE cases SET summary = COALESCE(summary, ?) || ?, updated_at = ?, handover_import_id = ?, handover_package_id = ?, handover_valid_until = ?, handover_status = ? WHERE id = ?`)
          .run(d.summary ?? '', `\n\n[Importierte Übergabe ${payload.packageId}]`, timestamp, importId, payload.packageId, payload.expiresAt ?? null, status, localId);
        updatedCaseIds.push(localId as string);
      }
      const finalLocalId = localId;
      if (!finalLocalId) throw new Error('Lokale Zielakte konnte nicht ermittelt werden.');
      caseRefToLocal.set(item.ref, finalLocalId);
      this.insertItem(db, importId, 'case', finalLocalId, item.ref, timestamp);
    }

    for (const item of payload.measures) {
      const d = item.data;
      const id = randomUUID();
      const caseId = caseRefToLocal.get(item.caseRef)!;
      measureRefToLocal.set(item.ref, id);
      db.prepare(`INSERT INTO case_measures (id, case_id, type, title, status, risk_level, created_from, summary, next_step, due_at, opened_at, closed_at, requires_follow_up, source_id, created_at, updated_at, handover_import_id, handover_package_id, handover_valid_until, handover_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseId, d.type ?? 'other', `[Übergabe] ${d.title ?? 'Maßnahme'}`, d.status ?? 'open', d.risk_level ?? 'normal', 'import', d.summary ?? null, d.next_step ?? null, d.due_at ?? null, d.opened_at ?? timestamp, d.closed_at ?? null, d.requires_follow_up ?? 0, null, timestamp, timestamp, importId, payload.packageId, payload.expiresAt ?? null, status);
      this.insertItem(db, importId, 'case_measure', id, item.ref, timestamp);
    }

    for (const item of payload.notes) {
      const d = item.data;
      const id = randomUUID();
      const caseId = caseRefToLocal.get(item.caseRef)!;
      db.prepare(`INSERT INTO case_notes (id, case_id, title, note_date, note_type, participants, content, next_steps, contains_health_data, confidential_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseId, `[Übergabe] ${d.title ?? 'Notiz'}`, d.note_date ?? timestamp, d.note_type ?? 'sonstiges', d.participants ?? null, d.content ?? '', d.next_steps ?? null, d.contains_health_data ?? 1, d.confidential_level ?? 'sensibel', timestamp, timestamp);
      this.insertItem(db, importId, 'case_note', id, item.ref, timestamp);
    }

    for (const item of payload.measureNotes) {
      const d = item.data;
      const id = randomUUID();
      const caseId = caseRefToLocal.get(item.caseRef)!;
      const measureId = measureRefToLocal.get(item.measureRef)!;
      db.prepare(`INSERT INTO case_measure_notes (id, case_id, measure_type, measure_id, title, note_at, participants, content, next_steps, contains_health_data, confidential_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseId, d.measure_type ?? 'bem', measureId, `[Übergabe] ${d.title ?? 'Maßnahmennotiz'}`, d.note_at ?? timestamp, d.participants ?? null, d.content ?? '', d.next_steps ?? null, d.contains_health_data ?? 1, d.confidential_level ?? 'sensibel', timestamp, timestamp);
      this.insertItem(db, importId, 'case_measure_note', id, item.ref, timestamp);
    }

    for (const item of payload.deadlines) {
      const d = item.data;
      const id = randomUUID();
      const caseId = item.caseRef ? caseRefToLocal.get(item.caseRef) : null;
      const measureId = item.measureRef ? measureRefToLocal.get(item.measureRef) : null;
      db.prepare(`INSERT INTO deadlines (id, case_id, measure_id, process_id, process_type, deadline_type, title, confidential_title, description, due_at, reminder_at, legal_basis, source_event, severity, status, calculation_mode, is_legal_deadline, is_user_editable, warning_threshold_hours, critical_threshold_hours, dashboard_from_at, completed_at, completed_note, cancelled_at, cancelled_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseId, measureId, null, d.process_type ?? 'case', d.deadline_type ?? 'follow_up', `[Übergabe] ${d.title ?? 'Frist'}`, d.confidential_title ?? null, d.description ?? null, d.due_at ?? timestamp, d.reminder_at ?? null, d.legal_basis ?? null, d.source_event ?? null, d.severity ?? 'normal', d.status ?? 'open', d.calculation_mode ?? 'manual', d.is_legal_deadline ?? 0, d.is_user_editable ?? 1, d.warning_threshold_hours ?? 48, d.critical_threshold_hours ?? 24, d.dashboard_from_at ?? null, d.completed_at ?? null, d.completed_note ?? null, d.cancelled_at ?? null, d.cancelled_reason ?? null, timestamp, timestamp);
      this.insertItem(db, importId, 'deadline', id, item.ref, timestamp);
    }

    for (const item of payload.documents) {
      const d = item.data;
      const id = randomUUID();
      const caseId = caseRefToLocal.get(item.caseRef)!;
      const measureId = item.measureRef ? measureRefToLocal.get(item.measureRef) : null;
      storeImportedCaseDocument(db, {
        id,
        caseId,
        measureId,
        data: d,
        contentBase64: item.contentBase64,
        timestamp,
        dataDirectory: this.dataDirProvider(),
        titlePrefix: '[Übergabe] ',
      });
      this.insertItem(db, importId, 'case_document', id, item.ref, timestamp);
    }

    try { for (const id of [...createdCaseIds, ...updatedCaseIds]) new SearchIndexService(db).reindexCase(id); } catch { /* index best effort */ }
    const privacyReviewCaseIds = this.markImportedCasesForPrivacyReview(db, [...createdCaseIds, ...updatedCaseIds], timestamp, payload.expiresAt ? 'high' : 'normal');
    db.prepare('UPDATE case_handover_imports SET created_case_count = ?, updated_case_count = ? WHERE id = ?').run(createdCaseIds.length, updatedCaseIds.length, importId);
    this.audit(db, auditCaseHandoverImported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), mode: input.mode, result: 'success' }));
    return { imported: true, packageId: payload.packageId, mode: input.mode, createdCaseIds, updatedCaseIds, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, privacyReviewCaseIds, expiresAt: payload.expiresAt, expired: false };
  }

  continueExpired(input: CaseHandoverContinueExpiredInput): CaseHandoverContinueExpiredResult {
    const db = this.db();
    if (!input.reason?.trim()) throw new Error('Für die weitere Bearbeitung abgelaufener Übergabedaten ist eine Begründung erforderlich.');
    const timestamp = nowIso();
    db.prepare(`UPDATE cases SET handover_status = 'continued_after_expiry', handover_continue_confirmed_at = ?, handover_continue_reason = ? WHERE id = ? AND (handover_status = 'expired' OR (handover_status = 'active' AND handover_valid_until IS NOT NULL AND handover_valid_until < ?))`).run(timestamp, input.reason.trim(), input.caseId, timestamp);
    db.prepare(`UPDATE case_measures SET handover_status = 'continued_after_expiry', handover_continue_confirmed_at = ?, handover_continue_reason = ? WHERE case_id = ? AND (handover_status = 'expired' OR (handover_status = 'active' AND handover_valid_until IS NOT NULL AND handover_valid_until < ?))`).run(timestamp, input.reason.trim(), input.caseId, timestamp);
    this.audit(db, auditCaseHandoverContinuedAfterExpiry());
    return { caseId: input.caseId, confirmed: true, confirmedAt: timestamp };
  }

  private uniqueCaseNumber(db: DatabaseAdapter, base: string): string {
    const sanitized = base.replace(/\s+/g, '-').slice(0, 80) || 'UEBERGABE';
    let candidate = `${sanitized}-IMPORT`;
    let index = 2;
    while (this.row(db, 'SELECT id FROM cases WHERE case_number = ?', candidate)) candidate = `${sanitized}-IMPORT-${index++}`;
    return candidate;
  }

  private insertItem(db: DatabaseAdapter, importId: string, type: string, localId: string, packageRef: string, createdAt: string): void {
    db.prepare(`INSERT INTO case_handover_import_items (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), importId, type, localId, packageRef, createdAt);
  }
}
