import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { normalizeStoredDocumentPaths } from '../../../../services/documentStorageReferenceMigration.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3-multiple-ciphers') as new (file: string) => {
  exec(sql: string): void;
  prepare(sql: string): { run(...args: unknown[]): unknown; get(...args: unknown[]): Record<string, string> | undefined };
  close(): void;
};

describe('Umstellung gespeicherter Dokumentpfade', () => {
  it('überführt vorhandene absolute Pfade nach einer Verlagerung idempotent in relative Pfade', () => {
    const originalRoot = mkdtempSync(path.join(tmpdir(), 'gremia-doc-original-'));
    const restoredRoot = mkdtempSync(path.join(tmpdir(), 'gremia-doc-restored-'));
    const db = new Database(':memory:');
    try {
      db.exec(readFileSync(path.join(process.cwd(), 'database/schema.sql'), 'utf8'));
      const relative = 'documents/case-1/document-1.gsbvdoc';
      mkdirSync(path.join(originalRoot, 'documents', 'case-1'), { recursive: true });
      mkdirSync(path.join(restoredRoot, 'documents', 'case-1'), { recursive: true });
      const originalPath = path.join(originalRoot, relative);
      const restoredPath = path.join(restoredRoot, relative);
      writeFileSync(originalPath, Buffer.from('ciphertext'));
      copyFileSync(originalPath, restoredPath);
      db.prepare('INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('case-1', '2026-1', 'Testfall', 'sonstiges', '2026-01-01', '2026-01-01', '2026-01-01');
      db.prepare('INSERT INTO case_documents (id, case_id, filename, mime_type, storage_path, sha256, created_at, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run('document-1', 'case-1', 'test.pdf', 'application/pdf', originalPath, '0'.repeat(64), '2026-01-01', '2026-01-01');

      expect(normalizeStoredDocumentPaths(db as never, restoredRoot)).toBe(1);
      expect(db.prepare('SELECT storage_path FROM case_documents WHERE id = ?').get('document-1')?.storage_path).toBe(relative);
      expect(normalizeStoredDocumentPaths(db as never, restoredRoot)).toBe(0);
    } finally {
      db.close();
      rmSync(originalRoot, { recursive: true, force: true });
      rmSync(restoredRoot, { recursive: true, force: true });
    }
  });
});
