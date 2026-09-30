import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CaseService } from '../../../services/caseService';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe('Herkunft übernommener Gremia.BR-Dokumente', () => {
  it('bewahrt Remote-Dokument und Version an der verschlüsselten lokalen Kopie', async () => {
    const db = await openTestDatabase();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-br-origin-'));
    roots.push(root);
    try {
      new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
      const timestamp = '2026-09-30T08:00:00.000Z';
      db.prepare(`INSERT INTO cases (id, case_number, display_name, category, status, priority, opened_at,
        is_pseudonymized, is_locked, created_at, updated_at)
        VALUES ('case-1', 'SBV-2026-1', 'Fall', 'sonstiges', 'offen', 'normal', ?, 1, 0, ?, ?)`).run(timestamp, timestamp, timestamp);
      const source = path.join(root, 'quelle.txt');
      fs.writeFileSync(source, 'Vertraulicher Inhalt');
      const cases = new CaseService(() => db, () => root);
      const record = await cases.importDocument('case-1', source, false, undefined, {
        documentId: 'remote-doc', versionId: 'remote-v2', title: 'Stellungnahme',
      });
      expect(record.remoteOrigin).toEqual({ documentId: 'remote-doc', versionId: 'remote-v2', title: 'Stellungnahme' });
      const stored = db.prepare<{ storage_path: string }>('SELECT storage_path FROM case_documents WHERE id = ?').get(record.id);
      expect(stored?.storage_path).toBeTruthy();
      const descriptor = fs.openSync(path.resolve(root, stored!.storage_path), 'r');
      const encryptedPrefix = Buffer.alloc(128);
      try { fs.readSync(descriptor, encryptedPrefix, 0, encryptedPrefix.length, 0); }
      finally { fs.closeSync(descriptor); }
      expect(encryptedPrefix.toString('utf8')).not.toContain('Vertraulicher Inhalt');
      expect((await cases.listDocuments('case-1'))[0]?.remoteOrigin).toEqual(record.remoteOrigin);
    } finally { db.close(); }
  });
});
