import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';
import type { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import type { SearchIndexService } from './search/searchIndexService.js';
import { noteProcessTypeToCaseMeasureType, type CaseMeasureNoteProcessType, type DeleteCaseProcessInput, type DeleteCaseProcessResult } from '../src/app/core/models/case-measure.model.js';

const PROCESS_SOURCES: Record<CaseMeasureNoteProcessType, { table: string; statusColumn: string; typeValue?: string }> = {
  prevention: { table: 'prevention_processes', statusColumn: 'status' },
  bem: { table: 'bem_processes', statusColumn: 'status' },
  termination_hearing: { table: 'termination_hearings', statusColumn: 'status' },
  equalization: { table: 'equalization_processes', statusColumn: 'application_status' },
  participation: { table: 'case_measures', statusColumn: 'status', typeValue: 'sbv_participation' },
  workplace_accommodation: { table: 'case_measures', statusColumn: 'status', typeValue: 'workplace_accommodation' },
};

const ACTIVITY_TARGET_TYPES: Partial<Record<CaseMeasureNoteProcessType, string>> = {
  prevention: 'prevention_process',
  bem: 'bem_process',
  termination_hearing: 'termination_hearing',
  equalization: 'equalization_process',
  participation: 'sbv_participation',
};

const DELETE_REASON_CODES = new Set(['created_by_mistake', 'duplicate', 'no_longer_required', 'other']);

function changes(value: unknown): number {
  return Number((value as { changes?: number } | undefined)?.changes ?? 0);
}

function assertDeletionInput(input: DeleteCaseProcessInput): void {
  if (!input.caseId?.trim() || !input.processId?.trim()) throw new Error('Fall-ID und Maßnahmen-ID sind erforderlich.');
  if (!DELETE_REASON_CODES.has(input.reasonCode)) throw new Error('Bitte einen gültigen Löschgrund auswählen.');
}

function findProcess(db: DatabaseAdapter, input: DeleteCaseProcessInput): { id: string; case_id: string; status: string } {
  const source = PROCESS_SOURCES[input.processType];
  if (!source) throw new Error(`Unbekannter Maßnahmentyp: ${input.processType}`);
  const typeClause = source.typeValue ? ' AND type = ?' : '';
  const params = source.typeValue ? [input.processId, input.caseId, source.typeValue] : [input.processId, input.caseId];
  const row = db.prepare<{ id: string; case_id: string; status: string }>(
    `SELECT id, case_id, ${source.statusColumn} AS status FROM ${source.table} WHERE id = ? AND case_id = ?${typeClause}`,
  ).get(...params);
  if (!row) throw new Error('Die Maßnahme gehört nicht zur angegebenen Fallakte oder existiert nicht.');
  return row;
}

function deleteLinksAndChildren(db: DatabaseAdapter, input: DeleteCaseProcessInput): Pick<DeleteCaseProcessResult, 'detachedDocuments' | 'deletedNotes' | 'deletedDeadlines'> {
  let deletedNotes = changes(db.prepare('DELETE FROM case_measure_notes WHERE case_id = ? AND measure_type = ? AND measure_id = ?').run(input.caseId, input.processType, input.processId));
  if (input.processType === 'equalization') {
    deletedNotes += changes(db.prepare('DELETE FROM case_notes WHERE case_id = ? AND content LIKE ?').run(input.caseId, `[[equalization:${input.processId}]]%`));
  }
  const deletedDeadlines = changes(db.prepare('DELETE FROM deadlines WHERE case_id = ? AND (process_id = ? OR measure_id = ?)').run(input.caseId, input.processId, input.processId));
  const detachedDocuments = changes(db.prepare('UPDATE case_documents SET measure_id = NULL WHERE case_id = ? AND measure_id = ?').run(input.caseId, input.processId));
  const journalTarget = ACTIVITY_TARGET_TYPES[input.processType];
  if (journalTarget) db.prepare('DELETE FROM activity_journal_links WHERE target_type = ? AND target_id = ?').run(journalTarget, input.processId);
  if (input.processType === 'bem' || input.processType === 'participation') {
    db.prepare('DELETE FROM case_note_links WHERE target_type = ? AND target_id = ?').run(input.processType === 'bem' ? 'bem' : 'participation', input.processId);
  }
  return { detachedDocuments, deletedNotes, deletedDeadlines };
}

function deleteProcessRecord(db: DatabaseAdapter, input: DeleteCaseProcessInput): void {
  const source = PROCESS_SOURCES[input.processType];
  if (source.table === 'case_measures') {
    db.prepare('DELETE FROM case_measures WHERE id = ? AND case_id = ?').run(input.processId, input.caseId);
    return;
  }
  db.prepare(`DELETE FROM ${source.table} WHERE id = ? AND case_id = ?`).run(input.processId, input.caseId);
  const linkedType = noteProcessTypeToCaseMeasureType(input.processType);
  if (!linkedType) return;
  const linkedRows = db.prepare<{ id: string }>('SELECT id FROM case_measures WHERE case_id = ? AND type = ? AND source_id = ?').all(input.caseId, linkedType, input.processId);
  for (const linked of linkedRows) db.prepare('DELETE FROM case_measures WHERE id = ?').run(linked.id);
}

export function deleteCaseProcess(
  db: DatabaseAdapter,
  auditLog: PersonalDataAuditLogService,
  lifecycleAudit: MeasureLifecycleAuditService,
  searchIndex: SearchIndexService,
  input: DeleteCaseProcessInput,
): DeleteCaseProcessResult {
  assertDeletionInput(input);
  const existing = findProcess(db, input);
  const reportableType = noteProcessTypeToCaseMeasureType(input.processType) ?? 'other';
  let result: Pick<DeleteCaseProcessResult, 'detachedDocuments' | 'deletedNotes' | 'deletedDeadlines'> = { detachedDocuments: 0, deletedNotes: 0, deletedDeadlines: 0 };

  new DatabaseUnitOfWork(db).run(() => {
    lifecycleAudit.deleted(reportableType, input.processId, input.caseId, existing.status, 'single_measure');
    auditLog.append({ action: 'delete', subjectType: 'case_measure', subjectId: input.processId, caseId: input.caseId, purpose: `Fallmaßnahme gelöscht (${reportableType})`, metadata: { reasonCode: input.reasonCode } });
    result = deleteLinksAndChildren(db, input);
    deleteProcessRecord(db, input);
  });

  searchIndex.reindexCase(input.caseId);
  return { deleted: true, processType: input.processType, processId: input.processId, ...result };
}
