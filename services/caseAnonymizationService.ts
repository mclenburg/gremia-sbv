import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { RetentionOperationResult } from '../src/domain/models/retention.model.js';
import { applyPendingAnonymizationMarkers } from './textCommandPolicy.js';
import { DocumentContainerService } from './documentContainerService.js';
import { SearchIndexService } from './search/searchIndexService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { existingColumns } from './privacyEntityRegistry.js';
import { CASE_ANONYMIZATION_MATRIX, type CaseAnonymizationMatrixEntry } from './caseAnonymizationMatrix.js';
import { CASE_ANONYMIZATION_CONFIRMATION, REMOVED_PARTICIPANTS_TEXT, replaceFreeTextPreservingLength, type CaseAnonymizationMode } from './caseAnonymizationPolicy.js';
import { safeRun, tableExists } from './retentionSupport.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { CaseAnonymizationFileQuarantine } from './caseAnonymizationFileQuarantine.js';
import { CaseAnonymizationVerificationService, snapshotCaseAnonymizationHashChains } from './caseAnonymizationVerificationService.js';

type DatabaseRow = Record<string, string | number | null | undefined>;
interface CaseDocumentRow { id: string; storage_path?: string | null; }

function nowIso(): string { return new Date().toISOString(); }

function whereForMatrixEntry(entry: CaseAnonymizationMatrixEntry): string | null {
  if (entry.table === 'cases') return 'id = ?';
  if (entry.scope === 'case') return 'case_id = ?';
  if (entry.scope === 'bem_process') return 'process_id IN (SELECT id FROM bem_processes WHERE case_id = ?)';
  if (entry.scope === 'prevention_process') return 'process_id IN (SELECT id FROM prevention_processes WHERE case_id = ?)';
  if (entry.scope === 'participation') return 'participation_id IN (SELECT id FROM sbv_participations WHERE case_id = ?)';
  if (entry.scope === 'measure') return 'measure_id IN (SELECT id FROM case_measures WHERE case_id = ?)';
  if (entry.scope === 'deadline') return 'deadline_id IN (SELECT id FROM deadlines WHERE case_id = ?)';
  if (entry.scope === 'violation') {
    return entry.table === 'sbv_participation_violations'
      ? 'case_id = ?'
      : 'violation_id IN (SELECT id FROM sbv_participation_violations WHERE case_id = ?)';
  }
  return null;
}

function idColumnForTable(db: DatabaseAdapter, table: string): string {
  const columns = existingColumns(db, table);
  if (columns.has('id')) return 'id';
  if (columns.has('measure_id')) return 'measure_id';
  throw new Error(`Keine stabile Datensatz-ID für Anonymisierungsmatrix gefunden: ${table}`);
}

function replacementForText(current: string, mode: CaseAnonymizationMode): string {
  return mode === 'replace_all_free_text'
    ? replaceFreeTextPreservingLength(current)
    : applyPendingAnonymizationMarkers(current) ?? current;
}

function replaceMatrixText(db: DatabaseAdapter, caseId: string, mode: CaseAnonymizationMode, timestamp: string): number {
  let affected = 0;
  for (const entry of CASE_ANONYMIZATION_MATRIX) {
    if (entry.immutable || entry.relationStrategy || entry.scope === 'activity_journal' || !tableExists(db, entry.table)) continue;
    const where = whereForMatrixEntry(entry);
    if (!where) continue;
    const columns = existingColumns(db, entry.table);
    const freeTextFields = (entry.freeTextFields ?? []).filter((field) => columns.has(field));
    const participantFields = (entry.participantFields ?? []).filter((field) => columns.has(field));
    const fixedFields = Object.entries(entry.alwaysReplaceFields ?? {}).filter(([field]) => columns.has(field));
    const selectedFields = [...new Set([...freeTextFields, ...participantFields, ...fixedFields.map(([field]) => field)])];
    if (!selectedFields.length) continue;
    const idColumn = idColumnForTable(db, entry.table);
    const rows = db.prepare<DatabaseRow>(`SELECT ${idColumn}, ${selectedFields.join(', ')} FROM ${entry.table} WHERE ${where}`).all(caseId);
    const hasUpdatedAt = columns.has('updated_at');
    for (const row of rows) {
      const updates: string[] = [];
      const params: unknown[] = [];
      for (const field of freeTextFields) {
        const current = row[field];
        if (typeof current !== 'string' || !current) continue;
        const next = replacementForText(current, mode);
        if (next === current) continue;
        updates.push(`${field} = ?`);
        params.push(next);
      }
      for (const field of participantFields) {
        const current = row[field];
        if (typeof current !== 'string' || !current || current === REMOVED_PARTICIPANTS_TEXT) continue;
        updates.push(`${field} = ?`);
        params.push(REMOVED_PARTICIPANTS_TEXT);
      }
      for (const [field, literal] of fixedFields) {
        if (row[field] === literal) continue;
        updates.push(`${field} = ?`);
        params.push(literal);
      }
      if (!updates.length) continue;
      if (hasUpdatedAt) { updates.push('updated_at = ?'); params.push(timestamp); }
      params.push(row[idColumn]);
      affected += Number((db.prepare(`UPDATE ${entry.table} SET ${updates.join(', ')} WHERE ${idColumn} = ?`).run(...params) as { changes?: number }).changes ?? 0);
    }
  }
  return affected;
}

function listIds(db: DatabaseAdapter, sql: string, ...params: unknown[]): string[] {
  return db.prepare<{ id: string }>(sql).all(...params).map((row) => row.id).filter(Boolean);
}

function journalEntryIdsForCase(db: DatabaseAdapter, caseId: string, legacyPersonId: string | null, protectedPersonId: string | null, documentIds: readonly string[], generatedDocumentIds: readonly string[]): string[] {
  if (!tableExists(db, 'activity_journal_links')) return [];
  const targetSets = new Map<string, Set<string>>([
    ['case', new Set([caseId])],
    ['bem_process', new Set(tableExists(db, 'bem_processes') ? listIds(db, 'SELECT id FROM bem_processes WHERE case_id = ?', caseId) : [])],
    ['prevention_process', new Set(tableExists(db, 'prevention_processes') ? listIds(db, 'SELECT id FROM prevention_processes WHERE case_id = ?', caseId) : [])],
    ['sbv_participation', new Set(tableExists(db, 'sbv_participations') ? listIds(db, 'SELECT id FROM sbv_participations WHERE case_id = ?', caseId) : [])],
    ['termination_hearing', new Set(tableExists(db, 'termination_hearings') ? listIds(db, 'SELECT id FROM termination_hearings WHERE case_id = ?', caseId) : [])],
    ['equalization_process', new Set(tableExists(db, 'equalization_processes') ? listIds(db, 'SELECT id FROM equalization_processes WHERE case_id = ?', caseId) : [])],
    ['deadline', new Set(tableExists(db, 'deadlines') ? listIds(db, 'SELECT id FROM deadlines WHERE case_id = ?', caseId) : [])],
    ['document', new Set([...documentIds, ...generatedDocumentIds])],
    ['person', new Set([legacyPersonId, protectedPersonId].filter((value): value is string => Boolean(value)))],
  ]);
  const rows = db.prepare<{ entry_id: string; target_type: string; target_id: string }>('SELECT entry_id, target_type, target_id FROM activity_journal_links').all();
  return [...new Set(rows.filter((row) => targetSets.get(row.target_type)?.has(row.target_id)).map((row) => row.entry_id))];
}

function replaceActivityJournalText(db: DatabaseAdapter, entryIds: readonly string[], mode: CaseAnonymizationMode, timestamp: string): number {
  if (!entryIds.length || !tableExists(db, 'activity_journal_entries')) return 0;
  let affected = 0;
  for (const entryId of entryIds) {
    const row = db.prepare<DatabaseRow>('SELECT id, title, description, result_note FROM activity_journal_entries WHERE id = ?').get(entryId);
    if (!row) continue;
    const updates: string[] = [];
    const params: unknown[] = [];
    for (const field of ['title', 'description', 'result_note']) {
      const current = row[field];
      if (typeof current !== 'string' || !current) continue;
      const next = replacementForText(current, mode);
      if (next === current) continue;
      updates.push(`${field} = ?`);
      params.push(next);
    }
    if (!updates.length) continue;
    updates.push('updated_at = ?');
    params.push(timestamp, entryId);
    affected += safeRun(db, `UPDATE activity_journal_entries SET ${updates.join(', ')} WHERE id = ?`, ...params);
  }
  return affected;
}

function removeIdentityAndContactLinks(db: DatabaseAdapter, caseId: string, timestamp: string, handoverImportId: string | null): number {
  let affected = 0;
  affected += safeRun(db, `UPDATE cases SET display_name = '[Fall anonymisiert]', person_id = NULL, protected_person_id = NULL, person_binding_state = 'anonymized', is_pseudonymized = 1, privacy_review_required = 1, privacy_review_reason = 'linked_person_anonymized', anonymized_at = ?, handover_import_id = NULL, handover_package_id = NULL, handover_valid_until = NULL, handover_status = 'none', handover_continue_confirmed_at = NULL, updated_at = ? WHERE id = ?`, timestamp, timestamp, caseId);
  if (tableExists(db, 'case_measures')) affected += safeRun(db, `UPDATE case_measures SET handover_import_id = NULL, handover_package_id = NULL, handover_valid_until = NULL, handover_status = 'none', handover_continue_confirmed_at = NULL, updated_at = ? WHERE case_id = ?`, timestamp, caseId);
  if (tableExists(db, 'deadlines')) affected += safeRun(db, 'UPDATE deadlines SET person_id = NULL, updated_at = ? WHERE case_id = ? AND person_id IS NOT NULL', timestamp, caseId);
  if (tableExists(db, 'termination_hearings')) affected += safeRun(db, `UPDATE termination_hearings SET handover_import_id = NULL, handover_package_id = NULL, handover_valid_until = NULL, handover_status = 'none', handover_continue_confirmed_at = NULL, updated_at = ? WHERE case_id = ?`, timestamp, caseId);
  if (tableExists(db, 'person_case_links')) affected += safeRun(db, 'DELETE FROM person_case_links WHERE case_file_id = ?', caseId);
  if (tableExists(db, 'case_contacts')) affected += safeRun(db, 'DELETE FROM case_contacts WHERE case_id = ?', caseId);
  if (tableExists(db, 'bem_process_contacts')) affected += safeRun(db, 'DELETE FROM bem_process_contacts WHERE process_id IN (SELECT id FROM bem_processes WHERE case_id = ?)', caseId);
  if (tableExists(db, 'prevention_process_contacts')) affected += safeRun(db, 'DELETE FROM prevention_process_contacts WHERE process_id IN (SELECT id FROM prevention_processes WHERE case_id = ?)', caseId);
  if (tableExists(db, 'contact_text_references')) affected += safeRun(db, `DELETE FROM contact_text_references WHERE source_type = 'case_note' AND source_id IN (SELECT id FROM case_notes WHERE case_id = ?)`, caseId);
  if (tableExists(db, 'case_external_references')) affected += safeRun(db, 'DELETE FROM case_external_references WHERE case_id = ?', caseId);
  if (tableExists(db, 'case_handover_import_items')) {
    affected += safeRun(db, `DELETE FROM case_handover_import_items WHERE local_entity_type = 'case' AND local_entity_id = ?`, caseId);
    const childTargets = [
      ['case_measure', 'case_measures'],
      ['case_note', 'case_notes'],
      ['case_measure_note', 'case_measure_notes'],
      ['deadline', 'deadlines'],
      ['case_document', 'case_documents'],
    ] as const;
    for (const [entityType, table] of childTargets) {
      if (!tableExists(db, table)) continue;
      affected += safeRun(db, `DELETE FROM case_handover_import_items WHERE local_entity_type = ? AND local_entity_id IN (SELECT id FROM ${table} WHERE case_id = ?)`, entityType, caseId);
    }
    if (handoverImportId && tableExists(db, 'case_handover_imports')) {
      affected += safeRun(db, `DELETE FROM case_handover_imports WHERE id = ? AND NOT EXISTS (SELECT 1 FROM case_handover_import_items WHERE handover_import_id = ?)`, handoverImportId, handoverImportId);
    }
  }
  return affected;
}

function listGeneratedDocuments(db: DatabaseAdapter, caseId: string): CaseDocumentRow[] {
  if (!tableExists(db, 'generated_documents')) return [];
  const violationClause = tableExists(db, 'sbv_participation_violations')
    ? ' OR violation_id IN (SELECT id FROM sbv_participation_violations WHERE case_id = ?)'
    : '';
  return violationClause
    ? db.prepare<CaseDocumentRow>(`SELECT id, storage_path FROM generated_documents WHERE case_id = ?${violationClause}`).all(caseId, caseId)
    : db.prepare<CaseDocumentRow>('SELECT id, storage_path FROM generated_documents WHERE case_id = ?').all(caseId);
}

function removeGeneratedDocumentRows(db: DatabaseAdapter, documents: readonly CaseDocumentRow[]): number {
  if (!documents.length || !tableExists(db, 'generated_documents')) return 0;
  let affectedRows = 0;
  if (tableExists(db, 'sbv_participation_violation_documents')) {
    for (const document of documents) affectedRows += safeRun(db, 'DELETE FROM sbv_participation_violation_documents WHERE document_id = ?', document.id);
  }
  for (const document of documents) affectedRows += safeRun(db, 'DELETE FROM generated_documents WHERE id = ?', document.id);
  return affectedRows;
}

function removeDeletedDocumentJournalLinks(db: DatabaseAdapter, ids: readonly string[]): number {
  if (!ids.length || !tableExists(db, 'activity_journal_links')) return 0;
  let affected = 0;
  for (const id of ids) affected += safeRun(db, `DELETE FROM activity_journal_links WHERE target_type = 'document' AND target_id = ?`, id);
  return affected;
}

function removePersonJournalLinks(db: DatabaseAdapter, personIds: readonly string[]): number {
  if (!personIds.length || !tableExists(db, 'activity_journal_links')) return 0;
  let affected = 0;
  for (const id of personIds) affected += safeRun(db, `DELETE FROM activity_journal_links WHERE target_type = 'person' AND target_id = ?`, id);
  return affected;
}

type PreparedEvidence = {
  id: string;
  filename: string;
  text: string;
  storagePath: string;
  sha256: string;
  documentKey: string;
  iv: string;
  authTag: string;
  sizeBytes: number;
};

async function prepareDocumentEvidence(dataDir: string, caseId: string, originalCount: number): Promise<PreparedEvidence | null> {
  if (originalCount <= 0) return null;
  const text = `Es waren ${originalCount} Dokumente hochgeladen.`;
  const id = randomUUID();
  const filename = 'Hinweis zu anonymisierten Dokumenten.txt';
  const plain = Buffer.from(text, 'utf8');
  try {
    const container = await new DocumentContainerService().writeEncryptedContainer({
      plain,
      storageRoot: dataDir,
      subdirectory: `documents/${caseId}`,
      documentId: id,
      filename,
      mimeType: 'text/plain',
    });
    return {
      id,
      filename,
      text,
      storagePath: container.storagePath,
      sha256: container.sha256,
      documentKey: container.documentKey,
      iv: container.iv,
      authTag: container.authTag,
      sizeBytes: plain.length,
    };
  } finally {
    plain.fill(0);
  }
}

function insertDocumentEvidence(db: DatabaseAdapter, caseId: string, caseNumber: string, evidence: PreparedEvidence | null, timestamp: string): number {
  if (!evidence) return 0;
  db.prepare(`INSERT INTO case_documents (
    id, case_id, measure_id, filename, display_title, mime_type, storage_path, sha256, extracted_text,
    document_key, iv, auth_tag, size_bytes, contains_health_data, extraction_quality, text_extraction_status,
    text_extracted_at, text_extractor_id, text_extraction_error, ocr_status, created_at, imported_at
  ) VALUES (?, ?, NULL, ?, ?, 'text/plain', ?, ?, ?, ?, ?, ?, ?, 0, 'high', 'completed', ?, 'case-anonymization-evidence', NULL, 'not_required', ?, ?)`)
    .run(evidence.id, caseId, evidence.filename, evidence.filename, evidence.storagePath, evidence.sha256, evidence.text, evidence.documentKey, evidence.iv, evidence.authTag, evidence.sizeBytes, timestamp, timestamp, timestamp);
  if (tableExists(db, 'case_documents_fts')) {
    db.prepare(`INSERT INTO case_documents_fts (id, case_id, case_number, title, filename, extracted_text) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(evidence.id, caseId, caseNumber, evidence.filename, evidence.filename, evidence.text);
  }
  return 1;
}

export class CaseAnonymizationService {
  constructor(private readonly database: DatabaseAdapter, private readonly dataDirProvider: () => string) {}

  async anonymizeCase(caseId: string, reason: string, confirmation: string, mode: CaseAnonymizationMode): Promise<RetentionOperationResult> {
    if (confirmation !== CASE_ANONYMIZATION_CONFIRMATION) return { ok: false, action: 'none', error: `Bitte exakt „${CASE_ANONYMIZATION_CONFIRMATION}“ eingeben.` };
    if (!reason.trim()) return { ok: false, action: 'none', error: 'Für die Anonymisierung ist ein dokumentierter Grund erforderlich.' };
    if (mode !== 'marked_free_text' && mode !== 'replace_all_free_text') return { ok: false, action: 'none', error: 'Bitte einen gültigen Anonymisierungsmodus auswählen.' };

    const db = this.database;
    const dataDir = this.dataDirProvider();
    const row = db.prepare<{ id: string; case_number: string; person_id: string | null; protected_person_id: string | null; handover_import_id: string | null }>(
      'SELECT id, case_number, person_id, protected_person_id, handover_import_id FROM cases WHERE id = ?',
    ).get(caseId);
    if (!row) return { ok: false, action: 'none', error: 'Fall nicht gefunden.' };

    const documents = tableExists(db, 'case_documents') ? db.prepare<CaseDocumentRow>('SELECT id, storage_path FROM case_documents WHERE case_id = ?').all(caseId) : [];
    const generatedDocuments = listGeneratedDocuments(db, caseId);
    const originalDocumentCount = documents.length;
    const uploadedDocumentIds = documents.map((document) => document.id);
    const generatedDocumentIds = generatedDocuments.map((document) => document.id);
    const originalFilePaths = [...documents, ...generatedDocuments]
      .map((document) => document.storage_path)
      .filter((value): value is string => Boolean(value));
    const chainSnapshot = snapshotCaseAnonymizationHashChains(db);
    const quarantine = new CaseAnonymizationFileQuarantine(dataDir, caseId);
    let evidence: PreparedEvidence | null = null;
    let databaseCommitted = false;

    try {
      quarantine.stage(documents, generatedDocuments);
      evidence = await prepareDocumentEvidence(dataDir, caseId, originalDocumentCount);

      const timestamp = nowIso();
      const affectedRows = new DatabaseUnitOfWork(db).run(() => {
        const journalEntryIds = journalEntryIdsForCase(
          db,
          caseId,
          row.person_id,
          row.protected_person_id,
          uploadedDocumentIds,
          generatedDocumentIds,
        );
        let affected = 0;
        affected += removeGeneratedDocumentRows(db, generatedDocuments);
        affected += replaceMatrixText(db, caseId, mode, timestamp);
        affected += replaceActivityJournalText(db, journalEntryIds, mode, timestamp);
        affected += removeDeletedDocumentJournalLinks(db, [...uploadedDocumentIds, ...generatedDocumentIds]);
        affected += removePersonJournalLinks(db, [row.person_id, row.protected_person_id].filter((value): value is string => Boolean(value)));
        affected += removeIdentityAndContactLinks(db, caseId, timestamp, row.handover_import_id);
        if (tableExists(db, 'case_documents_fts')) affected += safeRun(db, 'DELETE FROM case_documents_fts WHERE case_id = ?', caseId);
        if (tableExists(db, 'case_document_ocr_jobs')) affected += safeRun(db, 'DELETE FROM case_document_ocr_jobs WHERE case_id = ?', caseId);
        if (tableExists(db, 'case_documents')) affected += safeRun(db, 'DELETE FROM case_documents WHERE case_id = ?', caseId);
        affected += insertDocumentEvidence(db, caseId, row.case_number, evidence, timestamp);
        if (tableExists(db, 'privacy_review_items')) {
          affected += safeRun(
            db,
            `UPDATE privacy_review_items
             SET protected_person_id = NULL, context_json = '{}', status = 'anonymized', updated_at = ?
             WHERE case_id = ?`,
            timestamp,
            caseId,
          );
        }
        affected += new SearchIndexService(db).deleteCase(caseId);
        affected += new SearchIndexService(db).reindexCase(caseId);

        db.exec(`CREATE TABLE IF NOT EXISTS retention_actions (
          id TEXT PRIMARY KEY, action_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, reference TEXT,
          reason TEXT, affected_rows INTEGER NOT NULL DEFAULT 0, affected_files INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
        )`);
        db.prepare(`INSERT INTO retention_actions (id, action_type, entity_type, entity_id, reference, reason, affected_rows, affected_files, created_at)
          VALUES (?, 'case_anonymized', 'case', ?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), caseId, row.case_number, reason.trim(), affected, quarantine.affectedFiles, timestamp);

        new PersonalDataAuditLogService(db).append({
          action: 'anonymize', subjectType: 'case', subjectId: caseId, caseId, purpose: 'Fallakte anonymisiert',
          metadata: { anonymizationMode: mode, originalDocumentCount, removedGeneratedDocumentCount: generatedDocumentIds.length, affectedRecordCount: affected, affectedFileCount: quarantine.affectedFiles, reasonDocumented: true },
        });

        new CaseAnonymizationVerificationService(db).verifyOrThrow({
          caseId,
          originalDocumentIds: uploadedDocumentIds,
          generatedDocumentIds,
          removedPersonIds: [row.person_id, row.protected_person_id].filter((value): value is string => Boolean(value)),
          expectedEvidenceText: evidence?.text,
          chainSnapshot,
        });
        return affected;
      });
      databaseCommitted = true;

      quarantine.commit();
      new CaseAnonymizationVerificationService(db).verifyFilesystemOrThrow(quarantine.root, originalFilePaths);

      const freeTextMessage = mode === 'marked_free_text'
        ? 'Nur vorgemerkte Freitextstellen wurden anonymisiert; nicht markierte Freitexte müssen weiterhin manuell geprüft werden.'
        : 'Alle erfassten Freitexte wurden vollständig ersetzt.';
      const documentMessage = originalDocumentCount > 0 ? ` ${originalDocumentCount} hochgeladene Dokument(e) wurden gelöscht und durch einen neutralen Hinweis ersetzt.` : '';
      return { ok: true, action: 'case_anonymized', message: `Fall ${row.case_number} wurde anonymisiert. ${freeTextMessage}${documentMessage}`, affectedRows, affectedFiles: quarantine.affectedFiles };
    } catch (error) {
      try {
        if (!databaseCommitted) quarantine.rollback(Boolean(evidence));
      } catch {
        // Der ursprüngliche Fehler bleibt maßgeblich; ein fehlgeschlagener Dateirücklauf
        // wird über die Fehlermeldung der Anonymisierung sichtbar und darf nicht kaschiert werden.
      }
      return {
        ok: false,
        action: 'none',
        error: error instanceof Error ? `Fall ${row.case_number} konnte nicht vollständig anonymisiert werden: ${error.message}` : `Fall ${row.case_number} konnte nicht vollständig anonymisiert werden.`,
        affectedRows: databaseCommitted ? undefined : 0,
        affectedFiles: databaseCommitted ? undefined : 0,
      };
    }
  }

}
