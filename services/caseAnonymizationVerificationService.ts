import fs from 'node:fs';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { tableExists } from './retentionSupport.js';

export interface CaseAnonymizationChainSnapshot {
  personalDataAuditRows: string[];
  legacyAuditRows: string[];
}

export interface CaseAnonymizationVerificationInput {
  caseId: string;
  originalDocumentIds: readonly string[];
  generatedDocumentIds: readonly string[];
  removedPersonIds: readonly string[];
  expectedEvidenceText?: string;
  chainSnapshot: CaseAnonymizationChainSnapshot;
}

function stableRows(db: DatabaseAdapter, sql: string): string[] {
  return db.prepare<Record<string, unknown>>(sql).all().map((row) => JSON.stringify(row));
}

function scalarCount(db: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  return Number(db.prepare<{ count: number }>(sql).get(...params)?.count ?? 0);
}

function assertZero(db: DatabaseAdapter, sql: string, message: string, ...params: unknown[]): void {
  if (scalarCount(db, sql, ...params) !== 0) throw new Error(message);
}

export function snapshotCaseAnonymizationHashChains(db: DatabaseAdapter): CaseAnonymizationChainSnapshot {
  return {
    personalDataAuditRows: tableExists(db, 'personal_data_audit_log')
      ? stableRows(db, 'SELECT * FROM personal_data_audit_log ORDER BY sequence ASC')
      : [],
    legacyAuditRows: tableExists(db, 'audit_log')
      ? stableRows(db, 'SELECT * FROM audit_log ORDER BY timestamp ASC, id ASC')
      : [],
  };
}

export class CaseAnonymizationVerificationService {
  constructor(private readonly database: DatabaseAdapter) {}

  verifyOrThrow(input: CaseAnonymizationVerificationInput): void {
    const caseRow = this.database.prepare<{ person_id: string | null; protected_person_id: string | null }>(
      'SELECT person_id, protected_person_id FROM cases WHERE id = ?',
    ).get(input.caseId);
    if (!caseRow || caseRow.person_id !== null || caseRow.protected_person_id !== null) {
      throw new Error('Post-Check: direkte Personenbindung der Fallakte wurde nicht vollständig entfernt.');
    }

    if (tableExists(this.database, 'person_case_links')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM person_case_links WHERE case_file_id = ?', 'Post-Check: Personen-Fall-Verknüpfung ist noch vorhanden.', input.caseId);
    if (tableExists(this.database, 'case_contacts')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM case_contacts WHERE case_id = ?', 'Post-Check: Fallkontakt ist noch vorhanden.', input.caseId);
    if (tableExists(this.database, 'bem_process_contacts')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM bem_process_contacts WHERE process_id IN (SELECT id FROM bem_processes WHERE case_id = ?)', 'Post-Check: BEM-Kontakt ist noch vorhanden.', input.caseId);
    if (tableExists(this.database, 'prevention_process_contacts')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM prevention_process_contacts WHERE process_id IN (SELECT id FROM prevention_processes WHERE case_id = ?)', 'Post-Check: Präventionskontakt ist noch vorhanden.', input.caseId);
    if (tableExists(this.database, 'case_external_references')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM case_external_references WHERE case_id = ?', 'Post-Check: externe Fallreferenz ist noch vorhanden.', input.caseId);
    if (tableExists(this.database, 'privacy_review_items')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM privacy_review_items WHERE case_id = ? AND protected_person_id IS NOT NULL', 'Post-Check: Datenschutzprüfung enthält noch eine Personen-ID.', input.caseId);
    if (tableExists(this.database, 'deadlines')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM deadlines WHERE case_id = ? AND person_id IS NOT NULL', 'Post-Check: Frist enthält noch eine Personen-ID.', input.caseId);
    if (tableExists(this.database, 'contact_text_references')) assertZero(this.database, `SELECT COUNT(*) AS count FROM contact_text_references WHERE source_type = 'case_note' AND source_id IN (SELECT id FROM case_notes WHERE case_id = ?)`, 'Post-Check: Kontakt-Textreferenz der Fallakte ist noch vorhanden.', input.caseId);
    if (tableExists(this.database, 'activity_journal_links')) {
      for (const personId of input.removedPersonIds) assertZero(this.database, `SELECT COUNT(*) AS count FROM activity_journal_links WHERE target_type = 'person' AND target_id = ?`, 'Post-Check: Journal enthält noch eine Personenverknüpfung.', personId);
      for (const documentId of [...input.originalDocumentIds, ...input.generatedDocumentIds]) assertZero(this.database, `SELECT COUNT(*) AS count FROM activity_journal_links WHERE target_type = 'document' AND target_id = ?`, 'Post-Check: Journal enthält noch eine Verknüpfung zu einem entfernten Dokument.', documentId);
    }
    if (tableExists(this.database, 'case_handover_import_items')) {
      assertZero(this.database, `SELECT COUNT(*) AS count FROM case_handover_import_items WHERE (local_entity_type = 'case' AND local_entity_id = ?) OR local_entity_id IN (SELECT id FROM case_measures WHERE case_id = ?) OR local_entity_id IN (SELECT id FROM case_notes WHERE case_id = ?) OR local_entity_id IN (SELECT id FROM case_measure_notes WHERE case_id = ?) OR local_entity_id IN (SELECT id FROM deadlines WHERE case_id = ?)`, 'Post-Check: Handover-Verknüpfung des anonymisierten Falls ist noch vorhanden.', input.caseId, input.caseId, input.caseId, input.caseId, input.caseId);
    }

    for (const id of input.originalDocumentIds) {
      if (tableExists(this.database, 'case_documents')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM case_documents WHERE id = ?', `Post-Check: ursprüngliches Falldokument ${id} ist noch registriert.`, id);
    }
    for (const id of input.generatedDocumentIds) {
      if (tableExists(this.database, 'generated_documents')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM generated_documents WHERE id = ?', `Post-Check: erzeugtes Dokument ${id} ist noch registriert.`, id);
    }
    if (tableExists(this.database, 'case_document_ocr_jobs')) assertZero(this.database, 'SELECT COUNT(*) AS count FROM case_document_ocr_jobs WHERE case_id = ?', 'Post-Check: OCR-Aufträge des anonymisierten Falls sind noch vorhanden.', input.caseId);

    if (tableExists(this.database, 'case_documents')) {
      const rows = this.database.prepare<{ extracted_text: string | null }>('SELECT extracted_text FROM case_documents WHERE case_id = ?').all(input.caseId);
      if (input.expectedEvidenceText) {
        if (rows.length !== 1 || rows[0]?.extracted_text !== input.expectedEvidenceText) {
          throw new Error('Post-Check: neutraler Dokumenthinweis fehlt oder ist nicht eindeutig.');
        }
      } else if (rows.length !== 0) {
        throw new Error('Post-Check: unerwartete Falldokumente sind nach der Anonymisierung vorhanden.');
      }
    }

    const currentPersonalRows = tableExists(this.database, 'personal_data_audit_log')
      ? stableRows(this.database, 'SELECT * FROM personal_data_audit_log ORDER BY sequence ASC')
      : [];
    const oldPersonalRows = input.chainSnapshot.personalDataAuditRows;
    if (currentPersonalRows.length < oldPersonalRows.length || !oldPersonalRows.every((row, index) => currentPersonalRows[index] === row)) {
      throw new Error('Post-Check: bestehende Personal-Data-HashChain wurde verändert statt ausschließlich ergänzt.');
    }
    if (!new PersonalDataAuditLogService(this.database).verifyChain().ok) {
      throw new Error('Post-Check: Personal-Data-HashChain ist nach der Anonymisierung nicht valide.');
    }

    const currentLegacyRows = tableExists(this.database, 'audit_log')
      ? stableRows(this.database, 'SELECT * FROM audit_log ORDER BY timestamp ASC, id ASC')
      : [];
    if (JSON.stringify(currentLegacyRows) !== JSON.stringify(input.chainSnapshot.legacyAuditRows)) {
      throw new Error('Post-Check: bestehende Legacy-HashChain wurde durch die Anonymisierung verändert.');
    }
  }

  verifyFilesystemOrThrow(quarantineRoot: string, originalPaths: readonly string[]): void {
    if (fs.existsSync(quarantineRoot)) throw new Error('Post-Check: Dateiquarantäne enthält noch Originaldateien.');
    for (const originalPath of originalPaths) {
      if (fs.existsSync(originalPath)) throw new Error(`Post-Check: ursprüngliche Dokumentdatei ist noch vorhanden: ${originalPath}`);
    }
  }
}
