import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { caseHandoverBaselineHash } from '../../../../services/caseHandoverBaselineHash';
import { DocumentContainerService } from '../../../../services/documentContainerService';
import { listVacationV5ImportedItemChanges, listVacationV5OriginItemChanges } from '../../../../services/vacationV5ImportedItemChanges';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, adapter };
}

describe('Format-5-Änderungsbestand', () => {
  it('prüft den Ursprungsbestand gegen die beim Export gespeicherte Basis', () => {
    const { raw, adapter } = database();
    try {
      raw.exec(`
        INSERT INTO case_handover_exports (id, package_id, exported_at, package_type, format_version)
          VALUES ('export-1', 'handover_origin', '2026-11-11', 'vacation_handover', 5);
        INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
          VALUES ('meeting-origin', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11');
      `);
      const baseline = caseHandoverBaselineHash(raw.prepare('SELECT * FROM sbv_meetings').get()!);
      raw.prepare(`INSERT INTO case_handover_export_items
        (id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at, baseline_sha256)
        VALUES ('item-origin', 'export-1', 'meeting_1', 'meeting', 'meeting-origin', '2026-11-11', ?)`).run(baseline);
      expect(listVacationV5OriginItemChanges(adapter, 'handover_origin', '').items[0].status).toBe('unchanged');
      raw.prepare("UPDATE sbv_meetings SET title = 'Geändert' WHERE id = 'meeting-origin'").run();
      expect(listVacationV5OriginItemChanges(adapter, 'handover_origin', '').items[0].status).toBe('changed');
      raw.prepare("DELETE FROM sbv_meetings WHERE id = 'meeting-origin'").run();
      expect(listVacationV5OriginItemChanges(adapter, 'handover_origin', '').items[0].status).toBe('missing');
      expect(() => listVacationV5OriginItemChanges(adapter, 'handover_unknown', '')).toThrow();
    } finally { raw.close(); }
  });

  it('erkennt unveränderte, geänderte und fehlende Kopien anhand der Import-Baselines samt Dokumentbytes', async () => {
    const { raw, adapter } = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-inventory-'));
    try {
      raw.exec(`
        INSERT INTO case_handover_imports (id, package_id, imported_at, valid_until, format_version)
          VALUES ('import-1', 'handover_inventory', '2026-11-11', '2099-11-30', 5);
        INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
          VALUES ('meeting-local', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11');
        INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
          VALUES ('case-local', 'SBV-12', 'Fall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11');
      `);
      const plain = Buffer.from('Dokumentinhalt', 'utf8');
      const stored = await new DocumentContainerService().writeEncryptedContainer({ plain, storageRoot: directory,
        subdirectory: 'documents', documentId: 'document-local', filename: 'Attest.pdf', mimeType: 'application/pdf' });
      raw.prepare(`INSERT INTO case_documents (id, case_id, filename, storage_path, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('document-local', 'case-local', 'Attest.pdf', ?, ?, ?, ?, ?, ?, '2026-11-11')`)
        .run(stored.storageReference, stored.sha256, stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes);
      const meeting = raw.prepare('SELECT * FROM sbv_meetings').get();
      const document = raw.prepare('SELECT * FROM case_documents').get();
      raw.prepare(`INSERT INTO case_handover_import_items
        (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
        VALUES ('item-meeting', 'import-1', 'meeting', 'meeting-local', 'meeting_1', '2026-11-11', ?)`)
        .run(caseHandoverBaselineHash(meeting!));
      raw.prepare(`INSERT INTO case_handover_import_items
        (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
        VALUES ('item-document', 'import-1', 'case_document', 'document-local', 'document_1', '2026-11-11', ?)`)
        .run(caseHandoverBaselineHash(document!, plain.toString('base64')));
      expect(listVacationV5ImportedItemChanges(adapter, 'handover_inventory', directory).items.map((item) => [item.ref, item.status]))
        .toEqual([['document_1', 'unchanged'], ['meeting_1', 'unchanged']]);
      raw.prepare("UPDATE sbv_meetings SET title = 'Geändert' WHERE id = 'meeting-local'").run();
      expect(listVacationV5ImportedItemChanges(adapter, 'handover_inventory', directory).items.map((item) => [item.ref, item.status]))
        .toEqual([['document_1', 'unchanged'], ['meeting_1', 'changed']]);
      raw.prepare("DELETE FROM sbv_meetings WHERE id = 'meeting-local'").run();
      expect(listVacationV5ImportedItemChanges(adapter, 'handover_inventory', directory).items[1].status).toBe('missing');
      fs.rmSync(stored.storagePath);
      expect(() => listVacationV5ImportedItemChanges(adapter, 'handover_inventory', directory)).toThrow();
    } finally { raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
