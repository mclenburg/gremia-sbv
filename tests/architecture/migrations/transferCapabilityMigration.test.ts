import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('Empfängerfähigkeiten-Migration 0070', () => {
  it('erhält ein altes deaktiviertes Profil und ergänzt optionale Fähigkeiten wiederholbar', async () => {
    const database = await openTestDatabase();
    try {
      database.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      database.exec('ALTER TABLE transfer_recipient_profiles DROP COLUMN capabilities_json');
      database.exec('ALTER TABLE transfer_recipient_profiles DROP COLUMN capability_revision');
      database.exec('ALTER TABLE transfer_recipient_profiles DROP COLUMN capability_confirmed_at');
      database.prepare(`INSERT INTO transfer_recipient_profiles (id, label, instance_id, key_fingerprint, recipient_token, active, created_at, updated_at)
        VALUES ('old', 'Bestand', 'ABCDE', 'fingerprint', 'token', 0, '2026-01-01', '2026-01-01')`).run();
      const migration = new MigrationService(database, path.resolve('database/schema.sql'), path.resolve('database/migrations'));
      expect(migration.migrate().currentSchemaVersion).toBe('0071');
      expect(migration.migrate().currentSchemaVersion).toBe('0071');
      expect(database.prepare('SELECT id, active, capabilities_json, capability_revision, capability_confirmed_at FROM transfer_recipient_profiles WHERE id = ?').get('old'))
        .toEqual({ id: 'old', active: 0, capabilities_json: null, capability_revision: null, capability_confirmed_at: null });
    } finally { database.close(); }
  });
});
