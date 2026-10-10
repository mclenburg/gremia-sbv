import type { DatabaseAdapter } from './databaseService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import { TextEntityReferenceService } from './textEntityReferenceService.js';
import { UnifiedSearchIndexService } from './search/unifiedSearchIndexService.js';
import { safeRun, tableExists, type DatabaseRow, type RetentionLifecycleRow } from './retentionSupport.js';

/** Runs inside the case deletion transaction, before the case row disappears. */
export function deleteRetentionCaseDependents(
  database: DatabaseAdapter,
  caseId: string,
  lifecycleRows: RetentionLifecycleRow[],
): number {
  let affectedRows = new UnifiedSearchIndexService(database).purgeCase(caseId);
  affectedRows += new TextEntityReferenceService(database).redact('case', caseId);
  const lifecycle = new MeasureLifecycleAuditService(database);
  for (const measure of lifecycleRows) {
    lifecycle.deleted(measure.measureType, measure.id, measure.caseId, measure.status, 'case_cascade');
  }
  affectedRows += safeRun(database, 'DELETE FROM case_documents_fts WHERE case_id = ?', caseId);
  if (tableExists(database, 'case_document_ocr_jobs')) {
    affectedRows += safeRun(database, 'DELETE FROM case_document_ocr_jobs WHERE document_id IN (SELECT id FROM case_documents WHERE case_id = ?)', caseId);
  }
  affectedRows += safeRun(database, 'DELETE FROM case_documents WHERE case_id = ?', caseId);
  const noteIds = database.prepare<DatabaseRow>('SELECT id FROM case_notes WHERE case_id = ?').all(caseId).map((note) => note.id);
  for (const noteId of noteIds) {
    affectedRows += safeRun(database, "DELETE FROM contact_text_references WHERE source_type = 'case_note' AND source_id = ?", noteId);
    affectedRows += safeRun(database, 'DELETE FROM case_notes_fts WHERE id = ?', noteId);
  }
  affectedRows += safeRun(database, 'DELETE FROM case_note_cases WHERE case_id = ?', caseId);
  affectedRows += safeRun(database, 'DELETE FROM case_notes WHERE case_id = ?', caseId);
  if (tableExists(database, 'case_measure_notes')) {
    affectedRows += safeRun(database, 'DELETE FROM case_measure_notes WHERE case_id = ?', caseId);
  }
  affectedRows += safeRun(database, 'DELETE FROM deadlines WHERE case_id = ?', caseId);
  return affectedRows;
}
