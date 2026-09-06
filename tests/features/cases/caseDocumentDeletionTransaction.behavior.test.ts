import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { CaseService } from '../../../services/caseService';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let database: DatabaseAdapter;
let temporaryRoot: string;
let dataRoot: string;
let documentPath: string;

async function migratedDatabase(): Promise<DatabaseAdapter> {
  const db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  return db;
}

beforeEach(async () => {
  database = await migratedDatabase();
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-document-delete-'));
  dataRoot = path.join(temporaryRoot, 'data');
  documentPath = path.join(dataRoot, 'documents', 'case-1', 'doc-1.gsbvdoc');
  fs.mkdirSync(path.dirname(documentPath), { recursive: true });
  fs.writeFileSync(documentPath, Buffer.from('verschlüsselter Container'));
});

afterEach(() => {
  database.close();
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function countRows(table: string): number {
  return database.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count ?? -1;
}

function insertDocumentFixture(): void {
  const timestamp = '2026-09-06T08:00:00.000Z';
  database.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run('case-1', 'SBV-2026-DOC-DEL', 'Dokumentlöschung', 'sonstiges', 'offen', 'normal', timestamp, timestamp, timestamp);
  database.prepare(`
    INSERT INTO case_documents (
      id, case_id, filename, display_title, mime_type, storage_path, sha256,
      document_key, iv, auth_tag, size_bytes, imported_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('doc-1', 'case-1', 'nachweis.pdf', 'Nachweis', 'application/pdf', documentPath, 'sha', 'key', 'iv', 'tag', 23, timestamp, timestamp);
  database.prepare(`
    INSERT INTO case_document_ocr_jobs (
      id, document_id, case_id, status, attempts, created_at, updated_at
    ) VALUES (?, ?, ?, 'queued', 0, ?, ?)
  `).run('ocr-job-1', 'doc-1', 'case-1', timestamp, timestamp);
  database.prepare(`
    INSERT INTO case_documents_fts (id, case_id, case_number, title, filename, extracted_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('doc-1', 'case-1', 'SBV-2026-DOC-DEL', 'Nachweis', 'nachweis.pdf', 'OCR-Inhalt');
}

describe('Falldokumente transaktional löschen', () => {
  it('rollt Dokument-, OCR- und FTS-Löschung zurück, wenn die verpflichtende Auditierung fehlschlägt', async () => {
    insertDocumentFixture();
    database.exec(`
      CREATE TRIGGER reject_document_delete_audit
      BEFORE INSERT ON personal_data_audit_log
      WHEN NEW.subject_type = 'case_document' AND NEW.action = 'delete'
      BEGIN
        SELECT RAISE(ABORT, 'audit chain unavailable');
      END;
    `);

    const service = new CaseService(() => database, () => dataRoot);
    await expect(service.deleteDocument('doc-1')).rejects.toThrow('audit chain unavailable');

    expect(countRows('case_documents')).toBe(1);
    expect(countRows('case_document_ocr_jobs')).toBe(1);
    expect(countRows('case_documents_fts')).toBe(1);
    expect(fs.existsSync(documentPath)).toBe(true);

    database.exec('DROP TRIGGER reject_document_delete_audit');
    await expect(service.deleteDocument('doc-1')).resolves.toEqual({ deleted: true });

    expect(countRows('case_documents')).toBe(0);
    expect(countRows('case_document_ocr_jobs')).toBe(0);
    expect(countRows('case_documents_fts')).toBe(0);
    expect(countRows('personal_data_audit_log')).toBe(1);
    expect(fs.existsSync(documentPath)).toBe(false);
  });
});
