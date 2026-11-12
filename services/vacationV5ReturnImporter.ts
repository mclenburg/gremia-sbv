import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { CaseHandoverImportUnitOfWork, type TrackImportedFile } from './caseHandoverImportUnitOfWork.js';
import { assertVacationV5ReturnChanges } from './vacationV5ReturnChanges.js';
import { previewVacationV5ReturnPayload } from './vacationV5ReturnPreview.js';
import { listVacationV5OriginItemChanges } from './vacationV5ImportedItemChanges.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';
import { VACATION_V5_CASE_ROW_FIELDS } from './vacationV5CaseRowPolicy.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverImported } from './auditEventBuilders.js';
import { storeImportedCaseDocument } from './caseHandoverImportedDocumentStore.js';
import { insertVacationV5ReturnOfficeItem } from './vacationV5ReturnOfficeImport.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import { uniqueImportedCaseNumber } from './caseHandoverCaseNumber.js';
import { replaceVacationV5ReturnDocument } from './vacationV5ReturnDocumentUpdate.js';
import type { VacationV5ReturnPayload } from './vacationV5ReturnTransport.js';
import type { VacationV5ReturnChoice } from '../src/domain/transfer/vacationV5ReturnReview.js';

const LINK_COLUMN: Readonly<Record<string, Record<string, { kind: string; column: string }>>> = {
  case: { protectedPersonRef: { kind: 'protected_person', column: 'protected_person_id' } },
  case_measure: { caseRef: { kind: 'case', column: 'case_id' } },
  case_note: { caseRef: { kind: 'case', column: 'case_id' } },
  case_measure_note: { caseRef: { kind: 'case', column: 'case_id' },
    measureRef: { kind: 'case_measure', column: 'measure_id' } },
  case_deadline: { caseRef: { kind: 'case', column: 'case_id' },
    measureRef: { kind: 'case_measure', column: 'measure_id' } },
  case_document: { caseRef: { kind: 'case', column: 'case_id' },
    measureRef: { kind: 'case_measure', column: 'measure_id' } },
  meeting_agenda: { meetingRef: { kind: 'meeting', column: 'meeting_id' } },
  recruiting_interview: { recruitingRef: { kind: 'recruiting', column: 'recruiting_participation_id' } },
  inclusion_topic: { agreementRef: { kind: 'inclusion_agreement', column: 'agreement_id' } },
  violation_event: { violationRef: { kind: 'violation', column: 'violation_id' } },
};
const PROCESS_PARENT: Readonly<Record<string, string>> = {
  sbv_meeting: 'meeting', recruiting_participation: 'recruiting',
  employer_obligation_review: 'employer_obligation', inclusion_agreement: 'inclusion_agreement',
  sbv_participation_violation: 'violation', sbv_assembly: 'assembly',
};
const ADDITION_ORDER = ['protected_person', 'case', 'meeting', 'recruiting', 'employer_obligation', 'inclusion_agreement',
  'violation', 'assembly', 'inclusion_officer', 'meeting_agenda', 'recruiting_interview',
  'inclusion_topic', 'violation_event', 'deadline', 'case_measure', 'case_note',
  'case_measure_note', 'case_deadline', 'case_document', 'generated_document',
  'workflow_document_link', 'violation_document_link'] as const;
const CASE_WORK_FIELDS = ['display_name', 'category', 'status', 'priority', 'closed_at',
  'summary', 'risk_level', 'review_at'] as const;

function supportedRow(kind: string): boolean {
  return ['protected_person', 'case', 'case_measure', 'case_note', 'case_measure_note', 'case_deadline', 'case_document',
    'generated_document', 'workflow_document_link', 'violation_document_link'].includes(kind)
    || Object.hasOwn(VACATION_V5_ROW_FIELDS, kind);
}

function rowConfiguration(kind: string): { table: string; fields: readonly string[] } {
  if (kind === 'protected_person' || kind === 'case' || kind === 'case_measure' || kind === 'case_note'
    || kind === 'case_measure_note' || kind === 'case_document') {
    return VACATION_V5_CASE_ROW_FIELDS[kind];
  }
  if (kind === 'case_deadline') return VACATION_V5_ROW_FIELDS.deadline;
  if (kind === 'generated_document') return { table: 'generated_documents', fields: ['created_at'] };
  if (kind === 'workflow_document_link') return { table: 'sbv_workflow_document_links', fields: ['created_at'] };
  if (kind === 'violation_document_link') return { table: 'sbv_participation_violation_documents', fields: ['created_at'] };
  if (!Object.hasOwn(VACATION_V5_ROW_FIELDS, kind)) throw new Error('Rückgabe enthält einen nicht unterstützten Vorgang.');
  return VACATION_V5_ROW_FIELDS[kind as keyof typeof VACATION_V5_ROW_FIELDS];
}

function insertAddition(database: DatabaseAdapter, change: { ref: string; kind: string;
  data: Record<string, string | number | boolean | null>; links?: Record<string, string>; contentBase64?: string },
  targets: Map<string, { kind: string; localId: string }>, timestamp: string,
  dataDirectory: string, trackFile: TrackImportedFile): string {
  if (['generated_document', 'workflow_document_link', 'violation_document_link'].includes(change.kind)) {
    return insertVacationV5ReturnOfficeItem(database, change, targets, timestamp, dataDirectory, trackFile);
  }
  const config = rowConfiguration(change.kind);
  const localId = randomUUID();
  const values: Record<string, string | number | boolean | null> = {
    ...change.data, id: localId, created_at: timestamp,
  };
  if ((config.fields as readonly string[]).includes('updated_at')) values.updated_at = timestamp;
  if (change.kind === 'violation') values.source_context_id = localId;
  if (change.kind === 'case') {
    values.case_number = uniqueImportedCaseNumber(database, String(change.data.case_number), true);
    values.display_name = String(change.data.display_name).replace(/^\[Übergabe\] /, '');
    if (!String(values.display_name).trim()) throw new Error('Neue Rückgabefallakte benötigt eine Bezeichnung.');
    values.protected_person_id = null;
    values.person_id = null;
    values.is_locked = 0;
    values.handover_status = 'none';
    if (!change.links?.protectedPersonRef && values.person_binding_state === 'active') {
      values.person_binding_state = 'legacy_unlinked';
    }
  }
  if (change.kind === 'case_measure') {
    values.created_from = 'import';
    values.source_id = null;
  }
  if (change.kind === 'case_deadline') {
    if (change.data.process_type !== 'case') throw new Error('Fallfrist enthält einen fremden Vorgangsbezug.');
    values.process_id = null;
    values.person_id = null;
  }
  const rules = change.kind === 'deadline' && change.links?.processRef
    ? { processRef: { kind: PROCESS_PARENT[String(change.data.process_type)], column: 'process_id' } }
    : LINK_COLUMN[change.kind] ?? {};
  for (const [name, ref] of Object.entries(change.links ?? {})) {
    const rule = rules[name];
    const target = targets.get(ref);
    if (!rule?.kind || !target || target.kind !== rule.kind) {
      throw new Error('Neuer Rückgabevorgang enthält eine nicht übernommene Elternbeziehung.');
    }
    values[rule.column] = target.localId;
  }
  assertCaseMeasureLinks(database, change.kind, values);
  if (change.kind === 'case_document') {
    if (!change.contentBase64 || typeof values.case_id !== 'string') {
      throw new Error('Rückgabedokument enthält keine auflösbaren Bytes oder Fallbeziehung.');
    }
    storeImportedCaseDocument(database, { id: localId, caseId: values.case_id,
      measureId: typeof values.measure_id === 'string' ? values.measure_id : null,
      data: change.data, contentBase64: change.contentBase64, timestamp, dataDirectory,
      titlePrefix: '[Rückgabe] ', trackFile });
    return localId;
  }
  const fields = Object.keys(values);
  database.prepare(`INSERT INTO ${config.table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`)
    .run(...fields.map((field) => values[field]));
  return localId;
}

function assertCaseMeasureLinks(database: DatabaseAdapter, kind: string,
  row: Record<string, unknown>): void {
  if ((kind !== 'case_measure_note' && kind !== 'case_deadline' && kind !== 'case_document') || !row.measure_id) return;
  const measure = database.prepare<{ case_id: string; type: string }>(
    'SELECT case_id, type FROM case_measures WHERE id = ?').get(row.measure_id);
  if (!measure || measure.case_id !== row.case_id
    || kind === 'case_measure_note' && measure.type !== row.measure_type) {
    throw new Error('Rückgabe enthält eine Maßnahme außerhalb der zugeordneten Fallakte.');
  }
}

function assertOriginalLinks(kind: string, links: Record<string, string> | undefined,
  row: Record<string, unknown>, targets: Map<string, { kind: string; localId: string }>): void {
  const expected = kind === 'deadline' && links?.processRef
    ? { processRef: { kind: PROCESS_PARENT[String(row.process_type)], column: 'process_id' } }
    : LINK_COLUMN[kind] ?? {};
  for (const [name, ref] of Object.entries(links ?? {})) {
    const rule = expected[name];
    const target = targets.get(ref);
    if (!rule || !rule.kind || !target || target.kind !== rule.kind || row[rule.column] !== target.localId) {
      throw new Error('Rückgabe ändert eine bestehende Elternbeziehung; bitte einzeln klären.');
    }
  }
}

function indexReturnChoices(choices: readonly VacationV5ReturnChoice[], count: number): Map<string, VacationV5ReturnChoice> {
  const byRef = new Map<string, VacationV5ReturnChoice>();
  for (const choice of choices) {
    if (!choice || typeof choice.ref !== 'string' || byRef.has(choice.ref)
      || !['accept_update', 'accept_conflict_update', 'accept_addition', 'keep_origin',
        'acknowledge_cancellation'].includes(choice.action)
      || (choice.expectedOriginSha256 !== null && !/^[0-9a-f]{64}$/.test(choice.expectedOriginSha256))) {
      throw new Error('Rückgabeentscheidung enthält ungültige oder doppelte Referenzen.');
    }
    byRef.set(choice.ref, choice);
  }
  if (byRef.size !== count) throw new Error('Nicht alle Rückgabeänderungen wurden entschieden.');
  return byRef;
}

function requestPrivacyReview(database: DatabaseAdapter, caseIds: ReadonlySet<string>, timestamp: string): void {
  if (!caseIds.size) return;
  const privacyReview = new PrivacyReviewService(database);
  privacyReview.ensureSchema();
  for (const caseId of caseIds) {
    const person = database.prepare<{ protected_person_id: string | null }>(
      'SELECT protected_person_id FROM cases WHERE id = ?').get(caseId);
    if (!person) throw new Error('Übernommener Rückgabevorgang hat keine Fallakte.');
    privacyReview.createForCase(caseId, person.protected_person_id, 'handover_imported',
      { returnDeltaReviewRequired: true }, timestamp, 'high');
  }
}

function collectAffectedCases(database: DatabaseAdapter, kind: string, localId: string,
  stored: Record<string, unknown>, caseIds: Set<string>): void {
  if (typeof stored.case_id === 'string') caseIds.add(stored.case_id);
  if (kind === 'case') caseIds.add(localId);
  if (kind === 'protected_person') {
    for (const row of database.prepare<{ id: string }>(
      'SELECT id FROM cases WHERE protected_person_id = ?').all(localId)) caseIds.add(row.id);
  }
}

function refreshOfficeDocumentBaselines(database: DatabaseAdapter,
  accepted: Array<{ ref: string; kind: string; localId: string; baselineSha256: string }>,
  changes: Map<string, ReturnType<typeof assertVacationV5ReturnChanges>[number]>): void {
  for (const item of accepted.filter((entry) => entry.kind === 'generated_document')) {
    const stored = database.prepare<Record<string, unknown>>('SELECT * FROM generated_documents WHERE id = ?')
      .get(item.localId);
    const content = changes.get(item.ref)?.contentBase64;
    if (!stored || !content) throw new Error('Übernommenes Amtsdokument konnte nicht bestätigt werden.');
    item.baselineSha256 = caseHandoverBaselineHash(stored, content);
  }
}

function updateOriginRow(database: DatabaseAdapter, table: string, fieldsInPolicy: readonly string[],
  kind: string, data: Record<string, string | number | boolean | null>, localId: string, timestamp: string): void {
  const fields = kind === 'case'
    ? CASE_WORK_FIELDS.filter((field) => Object.hasOwn(data, field)) as string[]
    : Object.keys(data).filter((field) => field !== 'created_at' && field !== 'updated_at'
      && (kind !== 'case_measure' || field !== 'created_from'));
  if (fieldsInPolicy.includes('updated_at')) fields.push('updated_at');
  if (!fields.length) throw new Error('Rückgabe enthält keine übernehmbaren Felder.');
  if (kind === 'case' && !String(data.display_name).replace(/^\[Übergabe\] /, '').trim()) {
    throw new Error('Rückgabe enthält keine gültige Fallbezeichnung.');
  }
  const values = fields.map((field) => field === 'updated_at' ? timestamp
    : kind === 'case' && field === 'display_name'
      ? String(data.display_name).replace(/^\[Übergabe\] /, '') : data[field]);
  database.prepare(`UPDATE ${table} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`)
    .run(...values, localId);
}

export function importConfirmedVacationV5Return(database: DatabaseAdapter, payload: VacationV5ReturnPayload,
  choices: readonly VacationV5ReturnChoice[], dataDirectory: string):
  { importId: string; acceptedCount: number; reviewedCount: number } {
  if (payload.packageType !== 'return_delta' || payload.version !== 5) throw new Error('Kein Format-5-Rückgabepaket.');
  const changes = assertVacationV5ReturnChanges(payload.changes);
  return new CaseHandoverImportUnitOfWork(database, () => dataDirectory).run((trackFile, retireFile) => {
    if (database.prepare<{ id: string }>('SELECT id FROM case_handover_imports WHERE package_id = ?').get(payload.packageId)) {
      throw new Error('Dieses Rückgabepaket wurde bereits übernommen.');
    }
    const preview = previewVacationV5ReturnPayload(database, payload, dataDirectory);
    const source = database.prepare<{ status: string }>('SELECT status FROM case_handover_exports WHERE id = ?').get(preview.exportId);
    if (source?.status !== 'open') throw new Error('Das Ausgangspaket wurde bereits zurückgenommen.');
    const currentByRef = new Map(listVacationV5OriginItemChanges(database, payload.sourcePackageId,
      dataDirectory).items.map((item) => [item.ref, item]));
    const choicesByRef = indexReturnChoices(choices, preview.items.length);
    const exportItems = database.prepare<{ package_ref: string; local_entity_type: string; local_entity_id: string }>(`
      SELECT package_ref, local_entity_type, local_entity_id FROM case_handover_export_items
      WHERE handover_export_id = ?`).all(preview.exportId);
    const targets = new Map(exportItems.map((item) => [item.package_ref,
      { kind: item.local_entity_type, localId: item.local_entity_id }]));
    const changeByRef = new Map(changes.map((change) => [change.ref, change]));
    const timestamp = new Date().toISOString();
    const importId = randomUUID();
    const accepted: Array<{ ref: string; kind: string; localId: string; baselineSha256: string }> = [];
    const affectedCaseIds = new Set<string>();
    let reviewedCount = 0;
    const plannedItems = [...preview.items].sort((a, b) => {
      if (a.decision !== 'review_addition' && b.decision === 'review_addition') return -1;
      if (a.decision === 'review_addition' && b.decision !== 'review_addition') return 1;
      return ADDITION_ORDER.indexOf(a.kind as typeof ADDITION_ORDER[number])
        - ADDITION_ORDER.indexOf(b.kind as typeof ADDITION_ORDER[number]);
    });
    for (const planned of plannedItems) {
      const choice = choicesByRef.get(planned.ref);
      const change = changeByRef.get(planned.ref);
      const current = currentByRef.get(planned.ref);
      if (!choice || !change || choice.expectedOriginSha256 !== (current?.currentSha256 ?? null)) {
        throw new Error('Rückgabebasis hat sich seit der Entscheidung geändert.');
      }
      if (planned.decision === 'review_removal') {
        if (choice.action !== 'acknowledge_cancellation') throw new Error('Stornowunsch benötigt eine ausdrückliche Prüfentscheidung.');
        reviewedCount += 1;
        continue;
      }
      if (choice.action === 'keep_origin') { reviewedCount += 1; continue; }
      if (planned.decision === 'review_addition' && choice.action === 'accept_addition'
        && change.operation === 'upsert' && change.deputyBaselineSha256 === null
        && change.data && supportedRow(change.kind)) {
        const localId = insertAddition(database, change as typeof change & {
          data: Record<string, string | number | boolean | null> }, targets, timestamp, dataDirectory, trackFile);
        targets.set(change.ref, { kind: change.kind, localId });
        const config = rowConfiguration(change.kind);
        const stored = database.prepare<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = ?`).get(localId);
        if (!stored) throw new Error('Neuer Rückgabevorgang konnte nicht bestätigt werden.');
        collectAffectedCases(database, change.kind, localId, stored, affectedCaseIds);
        accepted.push({ ref: change.ref, kind: change.kind, localId,
          baselineSha256: caseHandoverBaselineHash(stored,
            change.kind === 'case_document' || change.kind === 'generated_document' ? change.contentBase64 : undefined) });
        continue;
      }
      if (!((planned.decision === 'propose_update' && choice.action === 'accept_update')
          || (planned.decision === 'review_conflict' && choice.action === 'accept_conflict_update'))
        || change.operation !== 'upsert' || !change.data
        || !supportedRow(change.kind)
        || ['workflow_document_link', 'violation_document_link'].includes(change.kind)) {
        throw new Error('Diese Rückgabe kann nur nach gesonderter fachlicher Prüfung übernommen werden.');
      }
      const target = targets.get(change.ref);
      if (!target || target.kind !== change.kind || !current
        || current.status !== (choice.action === 'accept_update' ? 'unchanged' : 'changed')) {
        throw new Error('Rückgabe kann keinem unveränderten Ausgangsvorgang zugeordnet werden.');
      }
      const config = rowConfiguration(change.kind);
      const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = ?`).get(target.localId);
      if (!row) throw new Error('Ausgangsvorgang wurde entfernt.');
      if (change.kind === 'deadline' && change.data.process_type !== row.process_type
        || change.kind === 'case_deadline' && change.data.process_type !== 'case'
        || change.kind === 'case_measure' && change.data.type !== row.type
        || change.kind === 'case_measure_note' && change.data.measure_type !== row.measure_type
        || change.kind === 'violation' && change.data.source_context_type !== row.source_context_type) {
        throw new Error('Rückgabe ändert die Zuordnung eines Ausgangsvorgangs; bitte einzeln klären.');
      }
      assertOriginalLinks(change.kind, change.links, row, targets);
      assertCaseMeasureLinks(database, change.kind, row);
      if (change.kind === 'case_document' || change.kind === 'generated_document') {
        if (!change.contentBase64) throw new Error('Geändertes Rückgabedokument enthält keine geprüften Bytes.');
        replaceVacationV5ReturnDocument(database, { kind: change.kind, localId: target.localId,
          origin: row, data: change.data, contentBase64: change.contentBase64,
          dataDirectory, timestamp, trackFile, retireFile });
      } else updateOriginRow(database, config.table, config.fields, change.kind, change.data, target.localId, timestamp);
      const stored = database.prepare<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE id = ?`).get(target.localId);
      if (!stored) throw new Error('Übernommener Rückgabevorgang konnte nicht bestätigt werden.');
      collectAffectedCases(database, change.kind, target.localId, stored, affectedCaseIds);
      accepted.push({ ref: change.ref, kind: change.kind, localId: target.localId,
        baselineSha256: caseHandoverBaselineHash(stored,
          change.kind === 'case_document' || change.kind === 'generated_document' ? change.contentBase64 : undefined) });
    }
    refreshOfficeDocumentBaselines(database, accepted, changeByRef);
    requestPrivacyReview(database, affectedCaseIds, timestamp);
    database.prepare(`INSERT INTO case_handover_imports
      (id, package_id, imported_at, valid_until, status, mode, updated_case_count, metadata_json,
        origin_key_fingerprint, target_key_fingerprint, format_version, source_package_id)
      VALUES (?, ?, ?, ?, 'taken_over', 'return_delta', ?, ?, ?, ?, 5, ?)`)
      .run(importId, payload.packageId, timestamp, payload.expiresAt,
        affectedCaseIds.size, JSON.stringify({ acceptedCount: accepted.length, reviewedCount }),
        payload.origin.keyFingerprint, payload.target.keyFingerprint, payload.sourcePackageId);
    for (const item of accepted) {
      database.prepare(`INSERT INTO case_handover_import_items
        (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), importId, item.kind, item.localId, item.ref, timestamp, item.baselineSha256);
    }
    database.prepare("UPDATE case_handover_exports SET status = 'taken_over' WHERE id = ?").run(preview.exportId);
    new PersonalDataAuditLogService(database).append(auditCaseHandoverImported({
      packageId: payload.packageId, caseCount: affectedCaseIds.size, mode: 'return_delta', result: 'success',
    }));
    return { importId, acceptedCount: accepted.length, reviewedCount };
  });
}
