import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { APP_SCHEMA_VERSION, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS } from '../services/appSchema';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('SBV-Steuerungsprotokolle Schema-Integration', () => {
  it('bleibt als Migration 0040 vorhanden, während 0042 Beteiligungsverstöße ergänzt', () => {
    const latestMigration = readdirSync('database/migrations')
      .map((file) => file.match(/^(\d{4})[_-].+\.sql$/i)?.[1] ?? null)
      .filter((version): version is string => Boolean(version))
      .sort()
      .at(-1);

    expect(APP_SCHEMA_VERSION).toBe('0044');
    expect(latestMigration).toBe('0044');
  });

  it('führt sbv_control_protocols im Fresh-Install-Schema und rüstet Wiedervorlagen per Migration 0040 nach', () => {
    const schema = read('database/schema.sql');
    const initialMigration = read('database/migrations/0039_sbv_control_protocols.sql');
    const deadlineMigration = read('database/migrations/0040_sbv_control_protocol_deadlines.sql');

    expect(schema).toContain('CREATE TABLE IF NOT EXISTS sbv_control_protocols');
    for (const column of SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS) {
      expect(schema).toMatch(new RegExp(`\\b${column}\\b`));
    }
    expect(schema).toContain('idx_sbv_control_protocols_follow_up');
    expect(initialMigration).toContain('CREATE TABLE IF NOT EXISTS sbv_control_protocols');
    expect(deadlineMigration).toContain('ALTER TABLE sbv_control_protocols ADD COLUMN follow_up_due_at TEXT');
    expect(deadlineMigration).toContain('idx_sbv_control_protocols_follow_up');
  });

  it('nimmt Steuerungsprotokolle in Migration-Reparatur und Integritätsprüfung auf', () => {
    const migrationService = read('services/migrationService.ts');
    const integrityService = read('services/databaseIntegrityService.ts');

    expect(migrationService).toContain("case '0040'");
    expect(migrationService).toContain('ensureSbvControlProtocolSchema');
    expect(migrationService).toContain('SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS');
    expect(integrityService).toContain("'sbv_control_protocols'");
    expect(integrityService).toContain('SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS');
  });
});
