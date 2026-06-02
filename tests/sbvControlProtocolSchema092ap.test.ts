import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { APP_SCHEMA_VERSION, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS } from '../services/appSchema';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('SBV-Steuerungsprotokolle Schema-Integration', () => {
  it('hebt die App-Schemaversion auf die dedizierte Migration 0039', () => {
    const latestMigration = readdirSync('database/migrations')
      .map((file) => file.match(/^(\d{4})[_-].+\.sql$/i)?.[1] ?? null)
      .filter((version): version is string => Boolean(version))
      .sort()
      .at(-1);

    expect(APP_SCHEMA_VERSION).toBe('0039');
    expect(latestMigration).toBe('0039');
  });

  it('führt sbv_control_protocols im Fresh-Install-Schema und in der Migration', () => {
    const schema = read('database/schema.sql');
    const migration = read('database/migrations/0039_sbv_control_protocols.sql');

    for (const source of [schema, migration]) {
      expect(source).toContain('CREATE TABLE IF NOT EXISTS sbv_control_protocols');
      for (const column of SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS) {
        expect(source).toMatch(new RegExp(`\\b${column}\\b`));
      }
      expect(source).toContain('idx_sbv_control_protocols_partner');
      expect(source).toContain('idx_sbv_control_protocols_topic');
      expect(source).toContain('idx_sbv_control_protocols_status');
      expect(source).toContain('idx_sbv_control_protocols_meeting');
    }
  });

  it('nimmt Steuerungsprotokolle in Migration-Reparatur und Integritätsprüfung auf', () => {
    const migrationService = read('services/migrationService.ts');
    const integrityService = read('services/databaseIntegrityService.ts');

    expect(migrationService).toContain("case '0039'");
    expect(migrationService).toContain('ensureSbvControlProtocolSchema');
    expect(migrationService).toContain('SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS');
    expect(integrityService).toContain("'sbv_control_protocols'");
    expect(integrityService).toContain('SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS');
  });
});
