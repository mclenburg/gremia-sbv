import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('Fallübergabe-Ledger-Migration 0069', () => {
  it('ergänzt bestehende Exportzeilen verlustfrei und wiederholbar', async () => {
    const database = await openTestDatabase();
    try {
      database.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      database.exec('ALTER TABLE case_handover_export_items DROP COLUMN baseline_sha256');
      database.prepare(`INSERT INTO case_handover_exports (id, package_id, exported_at) VALUES (?, ?, ?)`)
        .run('export-old', 'handover_old', '2026-09-01T08:00:00.000Z');
      database.prepare(`INSERT INTO case_handover_export_items (id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run('item-old', 'export-old', 'deadline_1', 'deadline', 'deadline-old', '2026-09-01T08:00:00.000Z');

      const migration = new MigrationService(database, path.resolve('database/schema.sql'), path.resolve('database/migrations'));
      expect(migration.migrate().currentSchemaVersion).toBe('0069');
      expect(migration.migrate().currentSchemaVersion).toBe('0069');
      expect(database.prepare<{ baseline_sha256: string | null; local_entity_id: string }>('SELECT baseline_sha256, local_entity_id FROM case_handover_export_items WHERE id = ?').get('item-old'))
        .toEqual({ baseline_sha256: null, local_entity_id: 'deadline-old' });
    } finally {
      database.close();
    }
  });
});
