import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('Upgrade eines vorhandenen Tresors auf das append-only Audit', () => {
  it('führt Trigger- und MAC-Migration aus, ohne einen vorhandenen Audit-Eintrag zu verändern', async () => {
    const db = await openTestDatabase();
    const migrate = () => new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
    try {
      migrate();
      db.exec('DROP TRIGGER personal_data_audit_no_update; DROP TRIGGER personal_data_audit_no_delete;');
      db.exec('ALTER TABLE personal_data_audit_log DROP COLUMN entry_mac;');
      db.exec("DELETE FROM schema_migrations WHERE version IN ('0065', '0066');");
      db.prepare(`INSERT INTO personal_data_audit_log
        (id, sequence, occurred_at, actor, action, subject_type, purpose, metadata_json, previous_hash, entry_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run('historisch', 1, '2026-01-01', 'local', 'create', 'case', 'Test', '{}', '0'.repeat(64), '1'.repeat(64));

      expect(migrate().applied).toEqual(expect.arrayContaining([
        '0065_audit_append_only.sql', '0066_audit_keyed_integrity.sql',
      ]));
      expect(db.prepare<{ entry_hash: string }>('SELECT entry_hash FROM personal_data_audit_log WHERE id = ?').get('historisch')?.entry_hash)
        .toBe('1'.repeat(64));
      expect(() => db.exec("UPDATE personal_data_audit_log SET purpose='verändert' WHERE id='historisch'"))
        .toThrow(/append-only/);
      expect(() => db.exec("DELETE FROM personal_data_audit_log WHERE id='historisch'"))
        .toThrow(/append-only/);
      expect(migrate().applied).toEqual([]);
    } finally {
      db.close();
    }
  });
});
