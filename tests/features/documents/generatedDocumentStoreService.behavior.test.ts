import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { GeneratedDocumentStoreService } from '../../../services/generatedDocumentStoreService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

class GeneratedDocumentDb implements DatabaseAdapter {
  rows = new Map<string, Record<string, unknown>>();

  prepare<T = unknown>(sql: string) {
    return {
      all: () => [] as T[],
      get: (id: string) => this.rows.get(id) as T | undefined,
      run: (...params: unknown[]) => {
        if (sql.includes('INSERT INTO generated_documents')) {
          const [
            id,
            caseId,
            templateId,
            documentKind,
            templateVersion,
            title,
            storagePath,
            filename,
            mimeType,
            sha256,
            documentKey,
            iv,
            authTag,
            sizeBytes,
            createdAt,
          ] = params;
          this.rows.set(String(id), {
            id,
            case_id: caseId,
            template_id: templateId,
            document_kind: documentKind,
            template_version: templateVersion,
            title,
            storage_path: storagePath,
            filename,
            mime_type: mimeType,
            sha256,
            document_key: documentKey,
            iv,
            auth_tag: authTag,
            size_bytes: sizeBytes,
            created_at: createdAt,
          });
        }
        return {};
      },
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('GeneratedDocumentStoreService', () => {
  it('legt frei erzeugte PDFs verschlüsselt im zentralen generated_documents-Speicher ab und liest sie verifiziert zurück', async () => {
    const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-generated-documents-'));
    try {
      const database = new GeneratedDocumentDb();
      const store = new GeneratedDocumentStoreService(database, storageRoot);
      const plain = Buffer.from('%PDF-1.7\nEinladung äöüß');

      const record = await store.store({
        source: 'template',
        title: 'Einladung zur Versammlung',
        filename: 'einladung.pdf',
        mimeType: 'application/pdf',
        plain,
      });
      const row = database.rows.get(record.id);

      expect(record).toMatchObject({
        title: 'Einladung zur Versammlung',
        filename: 'einladung.pdf',
        mimeType: 'application/pdf',
        source: 'template',
      });
      expect(row?.document_kind).toBe('generic');
      expect(String(row?.storage_path)).toContain(`${path.sep}generated${path.sep}template${path.sep}`);
      expect(String(row?.storage_path)).toMatch(/\.gsbvdoc$/);
      expect(fs.readFileSync(String(row?.storage_path))).not.toEqual(plain);
      await expect(store.read(record.id)).resolves.toEqual(plain);
    } finally {
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it('arbeitet gegen das echte Anwendungsschema ohne Fremdschlüssel- oder Spaltenabweichungen', async () => {
    const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-generated-documents-real-schema-'));
    const database = await openTestDatabase();
    try {
      database.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      const store = new GeneratedDocumentStoreService(database, storageRoot);
      const plain = Buffer.from('%PDF-1.7\nRechtlich relevantes Schreiben äöüß');

      const record = await store.store({
        source: 'template',
        title: 'Externe Einladung',
        filename: 'externe-einladung.pdf',
        mimeType: 'application/pdf',
        plain,
      });

      const row = database.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM generated_documents WHERE id = ? AND document_kind = ?')
        .get(record.id, 'generic');
      expect(row?.count).toBe(1);
      const audit = database.prepare<{ count: number }>(`
        SELECT COUNT(*) AS count
        FROM personal_data_audit_log
        WHERE subject_type = 'generated_document'
          AND subject_id = ?
          AND action = 'create'
      `).get(record.id);
      expect(audit?.count).toBe(1);
      await expect(store.read(record.id)).resolves.toEqual(plain);
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });
});
