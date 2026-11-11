import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { DocumentContainerService } from '../../../../services/documentContainerService';
import { collectVacationV5OfficeDocuments } from '../../../../services/vacationV5OfficeDocumentCollector';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, adapter };
}

describe('Format-5-Amtsdokumentauswahl', () => {
  it('liest nur ausdrücklich gewählte und ausgewählten Vorgängen zugeordnete verschlüsselte Bytes', async () => {
    const { raw, adapter } = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-office-collect-'));
    try {
      raw.exec(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('meeting-1', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`);
      const plain = Buffer.from('Geheimes Protokoll', 'utf8');
      const stored = await new DocumentContainerService().writeEncryptedContainer({ plain, storageRoot: directory,
        subdirectory: 'office/meeting', documentId: 'document-1', filename: 'protokoll.pdf', mimeType: 'application/pdf' });
      raw.prepare(`INSERT INTO generated_documents (id, title, storage_path, filename, mime_type, sha256,
        document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('document-1', 'Protokoll', ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-11')`)
        .run(stored.storageReference, stored.filename, stored.mimeType, stored.sha256, stored.documentKey,
          stored.iv, stored.authTag, stored.sizeBytes);
      raw.exec(`INSERT INTO sbv_workflow_document_links
        (id, owner_type, owner_id, document_id, purpose, created_at)
        VALUES ('link-1', 'meeting', 'meeting-1', 'document-1', 'Protokoll', '2026-11-11')`);
      const selected = collectVacationV5OfficeDocuments(adapter, ['document-1'],
        { meeting_1: { kind: 'meeting', localId: 'meeting-1', baselineSha256: 'a'.repeat(64) } }, directory);
      expect(selected.sections.map((section) => section.type)).toEqual(['generated_document', 'workflow_document_link']);
      expect(selected.sections[0].items[0].contentBase64).toBe(plain.toString('base64'));
      expect(Object.keys(selected.sourceByRef)).toEqual(['generated_document_1', 'workflow_document_link_1']);
      expect(() => collectVacationV5OfficeDocuments(adapter, ['document-1'], {}, directory)).toThrow();
      fs.rmSync(stored.storagePath);
      expect(() => collectVacationV5OfficeDocuments(adapter, ['document-1'],
        { meeting_1: { kind: 'meeting', localId: 'meeting-1', baselineSha256: 'a'.repeat(64) } }, directory)).toThrow();
    } finally { raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
