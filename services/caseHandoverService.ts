import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type { CreatePersonalDataAuditInput } from '../src/app/core/models/audit.model.js';
import {
  auditCaseHandoverContinuedAfterExpiry,
  auditCaseHandoverExported,
  auditCaseHandoverImported,
  auditCaseHandoverImportInspected,
} from './auditEventBuilders.js';
import { SearchIndexService } from './search/searchIndexService.js';
import {
  buildCandidateMatches,
  CASE_HANDOVER_FORMAT,
  CASE_HANDOVER_VERSION,
  createPackageId,
  isExpired,
  packageRef,
  safeAuditMetadata,
} from './caseHandoverPolicy.js';
import {
  assertCaseHandoverEnvelope,
  decryptCaseHandoverEnvelope,
  encryptCaseHandoverPayloadV2,
  type CaseHandoverEnvelope,
} from './caseHandoverCrypto.js';
import { inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import type {
  CaseHandoverContinueExpiredInput,
  CaseHandoverContinueExpiredResult,
  CaseHandoverExportInput,
  CaseHandoverExportResult,
  CaseHandoverImportInput,
  CaseHandoverImportResult,
  CaseHandoverInspectResult,
} from '../src/app/core/models/case-handover.model.js';

type Row = Record<string, any>;
type PackagePayload = {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  purpose: string;
  cases: Array<{ ref: string; data: Row }>;
  protectedPersons: Array<{ ref: string; data: Row }>;
  notes: Array<{ ref: string; caseRef: string; data: Row }>;
  measures: Array<{ ref: string; caseRef: string; data: Row }>;
  measureNotes: Array<{ ref: string; caseRef: string; measureRef: string; data: Row }>;
  deadlines: Array<{ ref: string; caseRef?: string; measureRef?: string; data: Row }>;
  documents: Array<{ ref: string; caseRef: string; measureRef?: string; data: Row; contentBase64: string }>;
};

type DecryptedPackage = {
  payload: PackagePayload;
  transfer: {
    formatVersion: number;
    legacyFormat: boolean;
    algorithm: 'aes-256-gcm';
  };
};

function nowIso(): string { return new Date().toISOString(); }
function sha256(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex'); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

function safeString(value: unknown, fallback = ''): string { return String(value ?? fallback); }
function ensureArray(value?: string[]): string[] { return [...new Set((value ?? []).filter(Boolean))]; }

export class CaseHandoverService {
  constructor(private readonly dbProvider: () => DatabaseAdapter, private readonly dataDirProvider: () => string = () => path.join(process.cwd(), 'data')) {}

  private db(): DatabaseAdapter { const db = this.dbProvider(); this.ensureSchema(db); return db; }

  ensureSchema(db: DatabaseAdapter): void {
    const tryExec = (sql: string) => {
      try { db.exec(sql); } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/duplicate column name|already exists/i.test(message)) throw error;
      }
    };
    tryExec(`CREATE TABLE IF NOT EXISTS case_handover_imports (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      valid_until TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      mode TEXT NOT NULL DEFAULT 'create_new',
      created_case_count INTEGER NOT NULL DEFAULT 0,
      updated_case_count INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );`);
    tryExec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_package ON case_handover_imports(package_id);`);
    tryExec(`CREATE TABLE IF NOT EXISTS case_handover_import_items (
      id TEXT PRIMARY KEY,
      handover_import_id TEXT NOT NULL,
      local_entity_type TEXT NOT NULL,
      local_entity_id TEXT NOT NULL,
      package_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(handover_import_id) REFERENCES case_handover_imports(id) ON DELETE CASCADE
    );`);
    tryExec(`CREATE INDEX IF NOT EXISTS idx_case_handover_items_local ON case_handover_import_items(local_entity_type, local_entity_id);`);
    tryExec(`ALTER TABLE cases ADD COLUMN handover_import_id TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL;`);
    tryExec(`ALTER TABLE cases ADD COLUMN handover_package_id TEXT;`);
    tryExec(`ALTER TABLE cases ADD COLUMN handover_valid_until TEXT;`);
    tryExec(`ALTER TABLE cases ADD COLUMN handover_status TEXT NOT NULL DEFAULT 'none';`);
    tryExec(`ALTER TABLE cases ADD COLUMN handover_continue_confirmed_at TEXT;`);
    tryExec(`ALTER TABLE cases ADD COLUMN handover_continue_reason TEXT;`);
    tryExec(`ALTER TABLE case_measures ADD COLUMN handover_import_id TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL;`);
    tryExec(`ALTER TABLE case_measures ADD COLUMN handover_package_id TEXT;`);
    tryExec(`ALTER TABLE case_measures ADD COLUMN handover_valid_until TEXT;`);
    tryExec(`ALTER TABLE case_measures ADD COLUMN handover_status TEXT NOT NULL DEFAULT 'none';`);
    tryExec(`ALTER TABLE case_measures ADD COLUMN handover_continue_confirmed_at TEXT;`);
    tryExec(`ALTER TABLE case_measures ADD COLUMN handover_continue_reason TEXT;`);
    tryExec(`CREATE TABLE IF NOT EXISTS case_measure_notes (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      measure_type TEXT NOT NULL,
      measure_id TEXT NOT NULL,
      title TEXT NOT NULL,
      note_at TEXT NOT NULL,
      participants TEXT,
      content TEXT NOT NULL,
      next_steps TEXT,
      contains_health_data INTEGER NOT NULL DEFAULT 0,
      confidential_level TEXT NOT NULL DEFAULT 'sensibel',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    new PersonalDataAuditLogService(db);
  }

  private audit(db: DatabaseAdapter, event: CreatePersonalDataAuditInput): void {
    try { new PersonalDataAuditLogService(db).append(event); } catch (error) { console.warn('Gremia.SBV case handover audit write failed', error); }
  }

  private rows(db: DatabaseAdapter, sql: string, ...params: unknown[]): Row[] { try { return db.prepare<Row>(sql).all(...params); } catch { return []; } }
  private row(db: DatabaseAdapter, sql: string, ...params: unknown[]): Row | undefined { try { return db.prepare<Row>(sql).get(...params); } catch { return undefined; } }

  private decryptDocument(row: Row): Buffer {
    if (!row.storage_path || !row.document_key || !row.iv || !row.auth_tag) return Buffer.alloc(0);
    const encrypted = fs.readFileSync(row.storage_path);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(row.document_key, 'base64'), Buffer.from(row.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(row.auth_tag, 'base64'));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private collectPayload(db: DatabaseAdapter, input: CaseHandoverExportInput): PackagePayload {
    const caseIds = ensureArray(input.caseIds);
    if (!caseIds.length) throw new Error('Für eine Fallübergabe muss mindestens eine Fallakte ausgewählt sein.');
    if (!input.passphrase || input.passphrase.length < 10) throw new Error('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
    const measureFilter = new Set(ensureArray(input.measureIds));
    const packageId = createPackageId();
    const createdAt = nowIso();
    const payload: PackagePayload = { format: CASE_HANDOVER_FORMAT, version: CASE_HANDOVER_VERSION, packageId, createdAt, expiresAt: input.expiresAt, purpose: input.purpose?.trim() || 'Urlaubsübergabe / SBV-Vertretung', cases: [], protectedPersons: [], notes: [], measures: [], measureNotes: [], deadlines: [], documents: [] };
    const personIdToRef = new Map<string, string>();
    const caseIdToRef = new Map<string, string>();
    const measureIdToRef = new Map<string, string>();

    caseIds.forEach((caseId, index) => {
      const caseRow = this.row(db, 'SELECT * FROM cases WHERE id = ?', caseId);
      if (!caseRow) throw new Error(`Fallakte nicht gefunden: ${caseId}`);
      const ref = packageRef('case', index);
      caseIdToRef.set(caseId, ref);
      payload.cases.push({ ref, data: caseRow });
      if (caseRow.protected_person_id && !personIdToRef.has(caseRow.protected_person_id)) {
        const personRow = this.row(db, 'SELECT * FROM protected_persons WHERE id = ?', caseRow.protected_person_id);
        if (personRow) { const personRef = packageRef('person', personIdToRef.size); personIdToRef.set(caseRow.protected_person_id, personRef); payload.protectedPersons.push({ ref: personRef, data: personRow }); }
      }
    });

    const placeholders = caseIds.map(() => '?').join(',');
    const noteRows = this.rows(db, `SELECT * FROM case_notes WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
    noteRows.forEach((note, index) => payload.notes.push({ ref: packageRef('note', index), caseRef: caseIdToRef.get(note.case_id)!, data: note }));

    let measureRows = this.rows(db, `SELECT * FROM case_measures WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
    if (measureFilter.size) measureRows = measureRows.filter((m) => measureFilter.has(m.id));
    measureRows.forEach((measure, index) => { const ref = packageRef('measure', index); measureIdToRef.set(measure.id, ref); payload.measures.push({ ref, caseRef: caseIdToRef.get(measure.case_id)!, data: measure }); });

    if (measureRows.length) {
      const measureIds = measureRows.map((m) => m.id);
      const mp = measureIds.map(() => '?').join(',');
      const measureNoteRows = this.rows(db, `SELECT * FROM case_measure_notes WHERE measure_id IN (${mp}) ORDER BY created_at`, ...measureIds);
      measureNoteRows.forEach((note, index) => payload.measureNotes.push({ ref: packageRef('measure_note', index), caseRef: caseIdToRef.get(note.case_id)!, measureRef: measureIdToRef.get(note.measure_id)!, data: note }));
    }

    let deadlineRows = this.rows(db, `SELECT * FROM deadlines WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
    if (measureFilter.size) deadlineRows = deadlineRows.filter((d) => !d.measure_id || measureFilter.has(d.measure_id));
    deadlineRows.forEach((deadline, index) => payload.deadlines.push({ ref: packageRef('deadline', index), caseRef: deadline.case_id ? caseIdToRef.get(deadline.case_id) : undefined, measureRef: deadline.measure_id ? measureIdToRef.get(deadline.measure_id) : undefined, data: deadline }));

    let documentRows = this.rows(db, `SELECT * FROM case_documents WHERE case_id IN (${placeholders}) ORDER BY created_at`, ...caseIds);
    if (measureFilter.size) documentRows = documentRows.filter((d) => !d.measure_id || measureFilter.has(d.measure_id));
    documentRows.forEach((doc, index) => payload.documents.push({
        ref: packageRef('document', index),
        caseRef: caseIdToRef.get(doc.case_id)!,
        measureRef: doc.measure_id ? measureIdToRef.get(doc.measure_id) : undefined,
        data: this.sanitizeDocumentMetadata(doc),
        contentBase64: this.decryptDocument(doc).toString('base64'),
      }));
    return payload;
  }

  private sanitizeDocumentMetadata(doc: Row): Row {
    const { storage_path: _storagePath, document_key: _documentKey, iv: _iv, auth_tag: _authTag, ...metadata } = doc;
    return metadata;
  }

  private encryptPayload(payload: PackagePayload, passphrase: string): CaseHandoverEnvelope {
    return encryptCaseHandoverPayloadV2({
      payloadText: JSON.stringify(payload),
      passphrase,
      packageId: payload.packageId,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
    });
  }

  private decryptEnvelope(envelope: CaseHandoverEnvelope, passphrase: string): DecryptedPackage {
    const decrypted = decryptCaseHandoverEnvelope(envelope, passphrase);
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

  private readEnvelope(filePath: string): CaseHandoverEnvelope {
    const file = inspectCaseHandoverFilePath(filePath);
    return assertCaseHandoverEnvelope(JSON.parse(fs.readFileSync(file.filePath, 'utf8')));
  }

  private assertPayload(value: unknown, formatVersion: number): PackagePayload {
    if (!isRecord(value)) throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
    if (value.format !== CASE_HANDOVER_FORMAT || typeof value.version !== 'number') throw new Error('Fallübergabepaket enthält keine gültige Nutzdatenstruktur.');
    if (value.packageId === undefined || typeof value.packageId !== 'string') throw new Error('Fallübergabepaket enthält keine gültige Paketkennung.');
    if (value.createdAt === undefined || typeof value.createdAt !== 'string') throw new Error('Fallübergabepaket enthält kein gültiges Erstellungsdatum.');
    if (value.expiresAt !== undefined && typeof value.expiresAt !== 'string') throw new Error('Fallübergabepaket enthält kein gültiges Ablaufdatum.');
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

  private assertUniqueRefs(label: string, refs: string[]): void {
    if (refs.some((ref) => typeof ref !== 'string' || !ref)) throw new Error(`${label} im Fallübergabepaket enthalten ungültige Referenzen.`);
    if (new Set(refs).size !== refs.length) throw new Error(`${label} im Fallübergabepaket enthalten doppelte Referenzen.`);
  }

  async exportToFile(input: CaseHandoverExportInput, targetPath: string): Promise<CaseHandoverExportResult> {
    const db = this.db();
    const payload = this.collectPayload(db, input);
    const envelope = this.encryptPayload(payload, input.passphrase);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, JSON.stringify(envelope, null, 2), { mode: 0o600 });
    this.audit(db, auditCaseHandoverExported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), result: 'success' }));
    return { exported: true, filePath: targetPath, packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, expiresAt: payload.expiresAt };
  }

  inspect(filePath: string, passphrase: string): CaseHandoverInspectResult {
    const db = this.db();
    let envelope: CaseHandoverEnvelope | undefined;
    try { const file = inspectCaseHandoverFilePath(filePath); envelope = this.readEnvelope(file.filePath); const decrypted = this.decryptEnvelope(envelope, passphrase); const payload = decrypted.payload; const firstCase = payload.cases[0]?.data ?? {}; const firstPersonId = firstCase.protected_person_id; const person = payload.protectedPersons.find((p) => p.data.id === firstPersonId)?.data;
      const localCases = this.rows(db, `SELECT c.id, c.case_number, c.display_name, p.first_name AS protected_first_name, p.last_name AS protected_last_name FROM cases c LEFT JOIN protected_persons p ON p.id = c.protected_person_id`) as Array<{ id: string; case_number?: string; display_name?: string; protected_first_name?: string; protected_last_name?: string }>;
      const matches = buildCandidateMatches({ exportedCaseNumber: firstCase.case_number, exportedDisplayName: firstCase.display_name, exportedFirstName: person?.first_name, exportedLastName: person?.last_name, localCases });
      const expired = isExpired(payload.expiresAt);
      if (expired) {
        this.audit(db, auditCaseHandoverImportInspected({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), result: 'failed', reasonCode: 'expired_transfer_package' }));
      }
      return {
        valid: true,
        packageId: payload.packageId,
        createdAt: payload.createdAt,
        expiresAt: payload.expiresAt,
        isExpired: expired,
        caseCount: payload.cases.length,
        measureCount: payload.measures.length,
        documentCount: payload.documents.length,
        deadlineCount: payload.deadlines.length,
        matches,
        warnings: [
          ...file.warnings,
          ...(expired ? ['Das Übergabepaket ist abgelaufen und darf nicht mehr importiert werden. Bitte eine neue Übergabedatei anfordern.'] : []),
          ...(decrypted.transfer.legacyFormat ? ['Dieses Übergabepaket wurde mit einem älteren Schutzformat erstellt. Der Import ist möglich, für neue Übergaben sollte ein aktuelles Paket erstellt werden.'] : []),
        ],
        integrity: { verified: true, algorithm: decrypted.transfer.algorithm, formatVersion: decrypted.transfer.formatVersion, legacyFormat: decrypted.transfer.legacyFormat },
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
    const expired = isExpired(payload.expiresAt);
    if (expired) {
      this.audit(db, auditCaseHandoverImported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), mode: input.mode, result: 'failed', reasonCode: 'expired_transfer_package' }));
      throw new Error('Das Fallübergabepaket ist abgelaufen und darf nicht importiert werden. Bitte eine neue Übergabedatei anfordern.');
    }
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
      const plain = Buffer.from(item.contentBase64, 'base64');
      const documentKey = randomBytes(32); const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', documentKey, iv); const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]); const tag = cipher.getAuthTag();
      const storageDir = path.join(this.dataDirProvider(), 'documents', caseId); await fs.promises.mkdir(storageDir, { recursive: true }); const storagePath = path.join(storageDir, `${id}.gsbvdoc`); await fs.promises.writeFile(storagePath, encrypted);
      db.prepare(`INSERT INTO case_documents (id, case_id, measure_id, filename, display_title, mime_type, storage_path, sha256, extracted_text, document_key, iv, auth_tag, size_bytes, imported_at, extraction_quality, text_extraction_status, text_extracted_at, text_extractor_id, text_extraction_error, ocr_status, ocr_text, contains_health_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseId, measureId, d.filename ?? 'uebergabe-dokument.bin', d.display_title ?? d.filename ?? 'Übergabe-Dokument', d.mime_type ?? null, storagePath, sha256(plain), d.extracted_text ?? null, documentKey.toString('base64'), iv.toString('base64'), tag.toString('base64'), plain.length, timestamp, d.extraction_quality ?? 'unknown', d.text_extraction_status ?? 'unknown', d.text_extracted_at ?? null, d.text_extractor_id ?? null, d.text_extraction_error ?? null, d.ocr_status ?? 'not_required', d.ocr_text ?? null, d.contains_health_data ?? 1, timestamp);
      this.insertItem(db, importId, 'case_document', id, item.ref, timestamp);
    }

    try { for (const id of [...createdCaseIds, ...updatedCaseIds]) new SearchIndexService(db).reindexCase(id); } catch { /* index best effort */ }
    db.prepare('UPDATE case_handover_imports SET created_case_count = ?, updated_case_count = ? WHERE id = ?').run(createdCaseIds.length, updatedCaseIds.length, importId);
    this.audit(db, auditCaseHandoverImported({ packageId: payload.packageId, caseCount: payload.cases.length, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, validUntilPresent: Boolean(payload.expiresAt), mode: input.mode, result: 'success' }));
    return { imported: true, packageId: payload.packageId, mode: input.mode, createdCaseIds, updatedCaseIds, measureCount: payload.measures.length, documentCount: payload.documents.length, deadlineCount: payload.deadlines.length, expiresAt: payload.expiresAt, expired: false };
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
