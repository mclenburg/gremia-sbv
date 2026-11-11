import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { assertVacationV5CaseGraph, type VacationV5CaseItem, type VacationV5CaseSectionType } from './vacationV5CaseGraph.js';
import { VACATION_V5_CASE_ROW_FIELDS } from './vacationV5CaseRowPolicy.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { uniqueImportedCaseNumber } from './caseHandoverCaseNumber.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverImported } from './auditEventBuilders.js';
import { storeImportedCaseDocument } from './caseHandoverImportedDocumentStore.js';
import type { TrackImportedFile } from './caseHandoverImportUnitOfWork.js';

const ORDER: readonly VacationV5CaseSectionType[] = [
  'protected_person', 'case', 'case_measure', 'case_note', 'case_measure_note', 'case_deadline', 'case_document',
];

function requiredLink(localByRef: Map<string, string>, item: VacationV5CaseItem, key: string): string {
  const localId = localByRef.get(item.links[key]);
  if (!localId) throw new Error('Fallabschnitt enthält eine nicht importierte Elternreferenz.');
  return localId;
}

function insert(database: DatabaseAdapter, table: string, values: Record<string, string | number | boolean | null>): string {
  const id = randomUUID();
  const fields = { ...values, id };
  const columns = Object.keys(fields);
  database.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    .run(...columns.map((column) => fields[column as keyof typeof fields]));
  return id;
}

function valuesFor(kind: VacationV5CaseSectionType, item: VacationV5CaseItem, localByRef: Map<string, string>,
  importId: string, packageId: string, expiresAt: string, timestamp: string, database: DatabaseAdapter):
  Record<string, string | number | boolean | null> {
  const values: Record<string, string | number | boolean | null> = { ...item.data, created_at: timestamp };
  if (kind !== 'case_document') values.updated_at = timestamp;
  if (kind === 'case') {
    values.case_number = uniqueImportedCaseNumber(database, String(item.data.case_number));
    values.display_name = `[Übergabe] ${String(item.data.display_name)}`;
    values.protected_person_id = item.links.protectedPersonRef ? requiredLink(localByRef, item, 'protectedPersonRef') : null;
    if (!values.protected_person_id && values.person_binding_state === 'active') values.person_binding_state = 'legacy_unlinked';
    values.handover_import_id = importId;
    values.handover_package_id = packageId;
    values.handover_valid_until = expiresAt;
    values.handover_status = 'active';
    values.is_locked = 0;
  } else if (kind === 'case_measure') {
    values.case_id = requiredLink(localByRef, item, 'caseRef');
    values.created_from = 'import';
    values.source_id = null;
    values.handover_import_id = importId;
    values.handover_package_id = packageId;
    values.handover_valid_until = expiresAt;
    values.handover_status = 'active';
  } else if (kind === 'case_note') {
    values.case_id = requiredLink(localByRef, item, 'caseRef');
  } else if (kind === 'case_measure_note') {
    values.case_id = requiredLink(localByRef, item, 'caseRef');
    values.measure_id = requiredLink(localByRef, item, 'measureRef');
  } else if (kind === 'case_deadline') {
    if (values.process_type !== 'case') throw new Error('Fallfrist enthält einen nicht aufgelösten Vorgangsbezug.');
    values.case_id = requiredLink(localByRef, item, 'caseRef');
    values.measure_id = item.links.measureRef ? requiredLink(localByRef, item, 'measureRef') : null;
    values.process_id = null;
    values.person_id = null;
  }
  return values;
}

/** Adds case copies to an existing authenticated format-5 import inside its own savepoint. */
export function importVacationV5CaseSections(database: DatabaseAdapter, importId: string, packageId: string,
  expiresAt: string, sectionInput: unknown,
  options: { dataDirectory?: string; trackFile?: TrackImportedFile } = {}):
  { importedCount: number; localByRef: Record<string, string> } {
  if (!/^handover_[A-Za-z0-9_-]{4,120}$/.test(packageId) || !Number.isFinite(Date.parse(expiresAt))
    || Date.parse(expiresAt) <= Date.now()) throw new Error('Fallübergabepaket ist ungültig oder abgelaufen.');
  const sections = assertVacationV5CaseGraph(sectionInput);
  if (!sections.some((section) => section.type === 'case')) throw new Error('Fallpaket benötigt eine ausgewählte Fallakte.');
  if (sections.some((section) => section.type === 'case_document') && (!options.dataDirectory || !options.trackFile)) {
    throw new Error('Dokumente erfordern eine geschützte Ablage mit Rückabwicklung.');
  }
  const byType = new Map(sections.map((section) => [section.type, section]));
  return new DatabaseUnitOfWork(database).run(() => {
    const imported = database.prepare<{ package_id: string; format_version: number; valid_until: string | null }>(
      'SELECT package_id, format_version, valid_until FROM case_handover_imports WHERE id = ?').get(importId);
    if (!imported || imported.package_id !== packageId || imported.format_version !== 5 || imported.valid_until !== expiresAt) {
      throw new Error('Fallabschnitte gehören zu keinem passenden Format-5-Import.');
    }
    if (database.prepare<{ id: string }>("SELECT id FROM case_handover_import_items WHERE handover_import_id = ? AND local_entity_type = 'case' LIMIT 1").get(importId)) {
      throw new Error('Fallabschnitte wurden für dieses Paket bereits importiert.');
    }
    const timestamp = new Date().toISOString();
    const localByRef = new Map<string, string>();
    const created: Array<{ kind: VacationV5CaseSectionType; ref: string; localId: string }> = [];
    for (const kind of ORDER) {
      for (const item of byType.get(kind)?.items ?? []) {
        const table = kind === 'case_deadline' ? VACATION_V5_ROW_FIELDS.deadline.table : VACATION_V5_CASE_ROW_FIELDS[kind].table;
        let localId: string;
        if (kind === 'case_document') {
          localId = randomUUID();
          storeImportedCaseDocument(database, { id: localId, caseId: requiredLink(localByRef, item, 'caseRef'),
            measureId: item.links.measureRef ? requiredLink(localByRef, item, 'measureRef') : null,
            data: item.data, contentBase64: item.contentBase64!, timestamp, dataDirectory: options.dataDirectory!,
            titlePrefix: '[Übergabe] ', trackFile: options.trackFile });
        } else {
          localId = insert(database, table, valuesFor(kind, item, localByRef, importId, packageId, expiresAt, timestamp, database));
        }
        localByRef.set(item.ref, localId);
        created.push({ kind, ref: item.ref, localId });
      }
    }
    const privacyReview = new PrivacyReviewService(database);
    privacyReview.ensureSchema();
    for (const item of created.filter((entry) => entry.kind === 'case')) {
      const personId = database.prepare<{ protected_person_id: string | null }>('SELECT protected_person_id FROM cases WHERE id = ?')
        .get(item.localId)?.protected_person_id ?? null;
      privacyReview.createForCase(item.localId, personId, 'handover_imported', { freeTextReviewRequired: true }, timestamp, 'high');
    }
    for (const item of created) {
      const table = item.kind === 'case_deadline' ? VACATION_V5_ROW_FIELDS.deadline.table : VACATION_V5_CASE_ROW_FIELDS[item.kind].table;
      const stored = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(item.localId);
      if (!stored) throw new Error('Importierte Fallkopie konnte nicht bestätigt werden.');
      const sourceItem = byType.get(item.kind)?.items.find((candidate) => candidate.ref === item.ref);
      database.prepare(`INSERT INTO case_handover_import_items
        (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), importId, item.kind, item.localId, item.ref, timestamp,
        caseHandoverBaselineHash(stored, item.kind === 'case_document' ? sourceItem?.contentBase64 : undefined));
    }
    database.prepare('UPDATE case_handover_imports SET created_case_count = ? WHERE id = ?')
      .run(created.filter((item) => item.kind === 'case').length, importId);
    new PersonalDataAuditLogService(database).append(auditCaseHandoverImported({
      packageId, caseCount: byType.get('case')?.count ?? 0, deadlineCount: byType.get('case_deadline')?.count ?? 0,
      documentCount: byType.get('case_document')?.count ?? 0, validUntilPresent: true, mode: 'vacation_v5', result: 'success',
    }));
    return { importedCount: created.length, localByRef: Object.fromEntries(localByRef) };
  });
}
