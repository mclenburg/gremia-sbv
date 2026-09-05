import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CaseHandoverExportResult, CaseHandoverImportInput, CaseHandoverImportResult, CaseHandoverReturnDeltaExportInput } from '../src/domain/models/case-handover.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { auditCaseHandoverExported, auditCaseHandoverImported } from './auditEventBuilders.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { safeAuditMetadata } from './caseHandoverPolicy.js';
import { encryptCaseHandoverPayloadForRecipient } from './caseHandoverTargetCrypto.js';
import { collectCaseHandoverPayload } from './caseHandoverPayloadCollector.js';
import { recordCaseHandoverExport } from './caseHandoverExportLedger.js';
import { storeImportedCaseDocument } from './caseHandoverImportedDocumentStore.js';
import { inspectCaseHandoverFilePath } from './caseHandoverFilePolicy.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { OWNER_ONLY_FILE_MODE, restrictFileToOwner } from './secureFilePermissions.js';
import { nowIso, safeString, type PackagePayload, type Row } from './caseHandoverSupport.js';
import { PrivacyReviewService } from './privacyReviewService.js';

type ImportItemMap = Map<string, { packageRef: string; type: string }>;
type ExportTargetMap = Map<string, { localId: string; type: string }>;

export class CaseHandoverReturnDeltaService {
  constructor(private readonly database: DatabaseAdapter, private readonly dataDirProvider: () => string) {}

  async exportToFile(input: CaseHandoverReturnDeltaExportInput, targetPath: string): Promise<CaseHandoverExportResult> {
    const basis = this.resolveImportedBasis(input);
    const payload = this.buildDeltaPayload(input, basis.importedAt, basis.importItemMap);
    const recipient = parseTransferRecipientToken(input.targetRecipientToken);
    const envelope = encryptCaseHandoverPayloadForRecipient({
      payloadText: JSON.stringify(payload),
      passphrase: input.passphrase,
      packageId: payload.packageId,
      createdAt: payload.createdAt,
      recipient,
    });
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, JSON.stringify(envelope, null, 2), { mode: OWNER_ONLY_FILE_MODE });
    await restrictFileToOwner(targetPath);
    const targetInstanceId = 'crypto' in envelope ? envelope.recipientBinding?.targetInstanceId : undefined;
    recordCaseHandoverExport(this.database, payload, targetInstanceId);
    new PersonalDataAuditLogService(this.database).append(auditCaseHandoverExported({
      packageId: payload.packageId,
      caseCount: payload.cases.length,
      measureCount: payload.changedRefs?.measures?.length ?? 0,
      documentCount: payload.changedRefs?.documents?.length ?? 0,
      deadlineCount: payload.changedRefs?.deadlines?.length ?? 0,
      result: 'success',
    }));
    return {
      exported: true,
      filePath: inspectCaseHandoverFilePath(targetPath).filePath,
      packageId: payload.packageId,
      packageType: 'return_delta',
      caseCount: payload.cases.length,
      measureCount: payload.changedRefs?.measures?.length ?? 0,
      documentCount: payload.changedRefs?.documents?.length ?? 0,
      deadlineCount: payload.changedRefs?.deadlines?.length ?? 0,
      targetInstanceId,
    };
  }

  importPayload(payload: PackagePayload, input: CaseHandoverImportInput): CaseHandoverImportResult {
    if (!payload.sourcePackageId) throw new Error('Rückgabepaket enthält keine Ausgangspaket-Zuordnung.');
    const duplicate = this.database.prepare<{ id: string }>('SELECT id FROM case_handover_imports WHERE package_id = ?').get(payload.packageId);
    if (duplicate) throw new Error('Dieses Rückgabepaket wurde bereits importiert.');
    const exportMap = this.loadExportMap(payload.sourcePackageId);
    const caseRefToLocal = new Map<string, string>();
    for (const item of payload.cases) {
      const target = exportMap.get(item.ref);
      if (!target || target.type !== 'case') throw new Error('Rückgabepaket kann keiner ursprünglichen Fallakte zugeordnet werden.');
      caseRefToLocal.set(item.ref, target.localId);
    }
    const measureRefToLocal = this.resolveMeasureTargets(payload, exportMap, caseRefToLocal);
    const timestamp = nowIso();
    this.importNotes(payload, caseRefToLocal, timestamp);
    const updatedDeadlineIds = this.importDeadlines(payload, exportMap, caseRefToLocal, measureRefToLocal, timestamp);
    const createdDocumentIds = this.importDocuments(payload, caseRefToLocal, measureRefToLocal, timestamp);
    const privacyReviewCaseIds = [...new Set([...caseRefToLocal.values()])];
    const privacyReview = new PrivacyReviewService(this.database);
    privacyReview.ensureSchema();
    for (const caseId of privacyReviewCaseIds) {
      const row = this.database.prepare<{ protected_person_id: string | null }>('SELECT protected_person_id FROM cases WHERE id = ?').get(caseId);
      privacyReview.createForCase(caseId, row?.protected_person_id ?? null, 'handover_imported', { returnDeltaReviewRequired: true }, timestamp, 'high');
    }
    this.database.prepare(`INSERT INTO case_handover_imports (id, package_id, imported_at, valid_until, status, mode, created_case_count, updated_case_count, metadata_json) VALUES (?, ?, ?, NULL, 'returned', ?, 0, ?, ?)`)
      .run(randomUUID(), payload.packageId, timestamp, input.mode, privacyReviewCaseIds.length, JSON.stringify(safeAuditMetadata({
        packageId: payload.packageId,
        caseCount: privacyReviewCaseIds.length,
        measureCount: measureRefToLocal.size,
        documentCount: createdDocumentIds.length,
        deadlineCount: updatedDeadlineIds.length,
        result: 'success',
        mode: 'return_delta',
      })));
    this.database.prepare("UPDATE case_handover_exports SET status = 'returned' WHERE package_id = ?")
      .run(payload.sourcePackageId);
    new PersonalDataAuditLogService(this.database).append(auditCaseHandoverImported({
      packageId: payload.packageId,
      caseCount: privacyReviewCaseIds.length,
      measureCount: measureRefToLocal.size,
      documentCount: createdDocumentIds.length,
      deadlineCount: updatedDeadlineIds.length,
      mode: 'return_delta',
      result: 'success',
    }));
    return {
      imported: true,
      packageId: payload.packageId,
      mode: input.mode,
      createdCaseIds: [],
      updatedCaseIds: privacyReviewCaseIds,
      measureCount: measureRefToLocal.size,
      documentCount: createdDocumentIds.length,
      deadlineCount: updatedDeadlineIds.length,
      privacyReviewCaseIds,
      expired: false,
    };
  }

  private resolveImportedBasis(input: CaseHandoverReturnDeltaExportInput): { importedAt: string; importItemMap: ImportItemMap } {
    if (!input.sourcePackageId.trim()) throw new Error('Für eine Rückgabe muss das Ausgangspaket bekannt sein.');
    if (!input.caseIds.length) throw new Error('Für eine Rückgabe muss mindestens eine Fallakte ausgewählt sein.');
    const rows = this.database.prepare<{ handover_import_id: string; imported_at: string }>(`
      SELECT DISTINCT c.handover_import_id, i.imported_at
      FROM cases c
      JOIN case_handover_imports i ON i.id = c.handover_import_id
      WHERE c.id IN (${input.caseIds.map(() => '?').join(',')})
        AND c.handover_package_id = ?
        AND c.handover_import_id IS NOT NULL
    `).all(...input.caseIds, input.sourcePackageId);
    if (rows.length !== 1) throw new Error('Rückgabe ist nur für Fallakten aus demselben importierten Übergabepaket möglich.');
    const importedAt = rows[0].imported_at;
    const importItemRows = this.database.prepare<{ local_entity_type: string; local_entity_id: string; package_ref: string }>(
      'SELECT local_entity_type, local_entity_id, package_ref FROM case_handover_import_items WHERE handover_import_id = ?'
    ).all(rows[0].handover_import_id);
    return {
      importedAt,
      importItemMap: new Map(importItemRows.map((item) => [item.local_entity_id, { packageRef: item.package_ref, type: item.local_entity_type }])),
    };
  }

  private buildDeltaPayload(input: CaseHandoverReturnDeltaExportInput, importedAt: string, importItemMap: ImportItemMap): PackagePayload {
    const payload = collectCaseHandoverPayload(this.database, {
      caseIds: input.caseIds,
      passphrase: input.passphrase,
      targetRecipientToken: input.targetRecipientToken,
      purpose: 'Rückübergabe / Delta aus Urlaubsvertretung',
    }, this.dataDirProvider);
    payload.packageType = 'return_delta';
    payload.sourcePackageId = input.sourcePackageId;
    payload.deltaSince = importedAt;
    this.rewritePackageRefs(payload, importItemMap);
    this.pruneUnchangedPayload(payload, importedAt, importItemMap);
    return payload;
  }

  private rewritePackageRefs(payload: PackagePayload, importItemMap: ImportItemMap): void {
    const caseRefs = new Map<string, string>();
    const measureRefs = new Map<string, string>();
    const rewrite = (type: string, localId: unknown, fallback: string) => importItemMap.get(safeString(localId))?.packageRef ?? `${type}_return_${fallback}`;
    payload.cases.forEach((item, index) => { const old = item.ref; item.ref = rewrite('case', item.data.id, String(index + 1)); caseRefs.set(old, item.ref); });
    payload.protectedPersons.forEach((item, index) => { item.ref = rewrite('person', item.data.id, String(index + 1)); });
    payload.measures.forEach((item, index) => { const old = item.ref; item.ref = rewrite('measure', item.data.id, String(index + 1)); item.caseRef = caseRefs.get(item.caseRef) ?? item.caseRef; measureRefs.set(old, item.ref); });
    payload.notes.forEach((item, index) => { item.ref = rewrite('note', item.data.id, String(index + 1)); item.caseRef = caseRefs.get(item.caseRef) ?? item.caseRef; });
    payload.measureNotes.forEach((item, index) => { item.ref = rewrite('measure_note', item.data.id, String(index + 1)); item.caseRef = caseRefs.get(item.caseRef) ?? item.caseRef; item.measureRef = measureRefs.get(item.measureRef) ?? item.measureRef; });
    payload.deadlines.forEach((item, index) => { item.ref = rewrite('deadline', item.data.id, String(index + 1)); item.caseRef = item.caseRef ? caseRefs.get(item.caseRef) ?? item.caseRef : undefined; item.measureRef = item.measureRef ? measureRefs.get(item.measureRef) ?? item.measureRef : undefined; });
    payload.documents.forEach((item, index) => { item.ref = rewrite('document', item.data.id, String(index + 1)); item.caseRef = caseRefs.get(item.caseRef) ?? item.caseRef; item.measureRef = item.measureRef ? measureRefs.get(item.measureRef) ?? item.measureRef : undefined; });
  }

  private pruneUnchangedPayload(payload: PackagePayload, importedAt: string, importItemMap: ImportItemMap): void {
    const isChanged = (item: { ref: string; data: Row }) => ![...importItemMap.values()].some((mapped) => mapped.packageRef === item.ref)
      || timestampAfter(item.data.updated_at, importedAt) || timestampAfter(item.data.created_at, importedAt);
    const changedNotes = payload.notes.filter(isChanged);
    const changedMeasureNotes = payload.measureNotes.filter(isChanged);
    const changedDeadlines = payload.deadlines.filter(isChanged);
    const changedDocuments = payload.documents.filter(isChanged);
    const neededMeasureRefs = new Set([...changedMeasureNotes.map((item) => item.measureRef), ...changedDeadlines.map((item) => item.measureRef), ...changedDocuments.map((item) => item.measureRef)].filter(Boolean) as string[]);
    const changedMeasures = payload.measures.filter((item) => isChanged(item) || neededMeasureRefs.has(item.ref));
    payload.notes = changedNotes;
    payload.measureNotes = changedMeasureNotes;
    payload.deadlines = changedDeadlines;
    payload.documents = changedDocuments;
    payload.measures = changedMeasures;
    payload.changedRefs = {
      cases: payload.cases.filter(isChanged).map((item) => item.ref),
      protectedPersons: payload.protectedPersons.filter(isChanged).map((item) => item.ref),
      notes: changedNotes.map((item) => item.ref),
      measures: changedMeasures.filter(isChanged).map((item) => item.ref),
      measureNotes: changedMeasureNotes.map((item) => item.ref),
      deadlines: changedDeadlines.map((item) => item.ref),
      documents: changedDocuments.map((item) => item.ref),
    };
  }

  private loadExportMap(sourcePackageId: string): ExportTargetMap {
    const rows = this.database.prepare<{ package_ref: string; local_entity_type: string; local_entity_id: string }>(`
      SELECT i.package_ref, i.local_entity_type, i.local_entity_id
      FROM case_handover_export_items i
      JOIN case_handover_exports e ON e.id = i.handover_export_id
      WHERE e.package_id = ?
    `).all(sourcePackageId);
    if (!rows.length) throw new Error('Rückgabepaket kann nicht zugeordnet werden: Das Ausgangspaket ist auf dieser Instanz nicht bekannt.');
    return new Map(rows.map((item) => [item.package_ref, { type: item.local_entity_type, localId: item.local_entity_id }]));
  }

  private resolveMeasureTargets(payload: PackagePayload, exportMap: ExportTargetMap, caseRefToLocal: Map<string, string>): Map<string, string> {
    const targets = new Map<string, string>();
    for (const item of payload.measures) {
      const existing = exportMap.get(item.ref);
      if (existing?.type === 'case_measure') {
        targets.set(item.ref, existing.localId);
        if (payload.changedRefs?.measures?.includes(item.ref)) {
          this.database.prepare('UPDATE case_measures SET status = ?, risk_level = ?, summary = COALESCE(?, summary), next_step = COALESCE(?, next_step), due_at = COALESCE(?, due_at), updated_at = ? WHERE id = ?')
            .run(item.data.status ?? 'open', item.data.risk_level ?? 'normal', item.data.summary ?? null, item.data.next_step ?? null, item.data.due_at ?? null, nowIso(), existing.localId);
        }
        continue;
      }
      const id = randomUUID();
      targets.set(item.ref, id);
      this.database.prepare(`INSERT INTO case_measures (id, case_id, type, title, status, risk_level, created_from, summary, next_step, due_at, opened_at, closed_at, requires_follow_up, source_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseRefToLocal.get(item.caseRef), item.data.type ?? 'other', `[Rückgabe] ${item.data.title ?? 'Maßnahme'}`, item.data.status ?? 'open', item.data.risk_level ?? 'normal', 'handover_return_delta', item.data.summary ?? null, item.data.next_step ?? null, item.data.due_at ?? null, item.data.opened_at ?? nowIso(), item.data.closed_at ?? null, item.data.requires_follow_up ?? 0, null, nowIso(), nowIso());
    }
    return targets;
  }

  private importNotes(payload: PackagePayload, caseRefToLocal: Map<string, string>, timestamp: string): string[] {
    return payload.notes.map((item) => {
      const id = randomUUID();
      this.database.prepare(`INSERT INTO case_notes (id, case_id, title, note_date, note_type, participants, content, next_steps, contains_health_data, confidential_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, caseRefToLocal.get(item.caseRef), `[Rückgabe] ${item.data.title ?? 'Notiz'}`, item.data.note_date ?? timestamp, item.data.note_type ?? 'sonstiges', item.data.participants ?? null, item.data.content ?? '', item.data.next_steps ?? null, item.data.contains_health_data ?? 1, item.data.confidential_level ?? 'sensibel', timestamp, timestamp);
      return id;
    });
  }

  private importDeadlines(payload: PackagePayload, exportMap: ExportTargetMap, caseRefToLocal: Map<string, string>, measureRefToLocal: Map<string, string>, timestamp: string): string[] {
    return payload.deadlines.map((item) => {
      const existing = exportMap.get(item.ref);
      if (existing?.type === 'deadline') {
        this.database.prepare('UPDATE deadlines SET title = ?, confidential_title = ?, description = ?, due_at = ?, reminder_at = ?, status = ?, completed_at = ?, completed_note = ?, updated_at = ? WHERE id = ?')
          .run(item.data.title ?? 'Rückgabe-Frist', item.data.confidential_title ?? null, item.data.description ?? null, item.data.due_at ?? timestamp, item.data.reminder_at ?? null, item.data.status ?? 'open', item.data.completed_at ?? null, item.data.completed_note ?? null, timestamp, existing.localId);
        return existing.localId;
      }
      const id = randomUUID();
      this.database.prepare(`INSERT INTO deadlines (id, case_id, measure_id, process_id, process_type, deadline_type, title, confidential_title, description, due_at, reminder_at, legal_basis, source_event, severity, status, calculation_mode, is_legal_deadline, is_user_editable, warning_threshold_hours, critical_threshold_hours, dashboard_from_at, completed_at, completed_note, cancelled_at, cancelled_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, item.caseRef ? caseRefToLocal.get(item.caseRef) : null, item.measureRef ? measureRefToLocal.get(item.measureRef) : null, null, item.data.process_type ?? 'case', item.data.deadline_type ?? 'follow_up', `[Rückgabe] ${item.data.title ?? 'Frist'}`, item.data.confidential_title ?? null, item.data.description ?? null, item.data.due_at ?? timestamp, item.data.reminder_at ?? null, item.data.legal_basis ?? null, item.data.source_event ?? null, item.data.severity ?? 'normal', item.data.status ?? 'open', item.data.calculation_mode ?? 'manual', item.data.is_legal_deadline ?? 0, item.data.is_user_editable ?? 1, item.data.warning_threshold_hours ?? 48, item.data.critical_threshold_hours ?? 24, item.data.dashboard_from_at ?? null, item.data.completed_at ?? null, item.data.completed_note ?? null, item.data.cancelled_at ?? null, item.data.cancelled_reason ?? null, timestamp, timestamp);
      return id;
    });
  }

  private importDocuments(
    payload: PackagePayload,
    caseRefToLocal: Map<string, string>,
    measureRefToLocal: Map<string, string>,
    timestamp: string,
  ): string[] {
    return payload.documents.map((item) => {
      const caseId = caseRefToLocal.get(item.caseRef);
      if (!caseId) throw new Error('Rückgabedokument kann keiner ursprünglichen Fallakte zugeordnet werden.');
      const id = randomUUID();
      storeImportedCaseDocument(this.database, {
        id,
        caseId,
        measureId: item.measureRef ? measureRefToLocal.get(item.measureRef) ?? null : null,
        data: item.data,
        contentBase64: item.contentBase64,
        timestamp,
        dataDirectory: this.dataDirProvider(),
        titlePrefix: '[Rückgabe] ',
      });
      return id;
    });
  }
}

function timestampAfter(value: unknown, since: string): boolean {
  if (typeof value !== 'string' || !value) return false;
  const time = new Date(value).getTime();
  const baseline = new Date(since).getTime();
  return Number.isFinite(time) && Number.isFinite(baseline) && time > baseline;
}
