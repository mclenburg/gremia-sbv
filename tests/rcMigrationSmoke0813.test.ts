import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeSourceText } from './helpers/sourceText';

function migrationSql(file: string): string {
  return normalizeSourceText(readFileSync(file, 'utf8'));
}

describe('RC migration smoke readiness', () => {
  it('keeps schema version aligned with the highest migration', () => {
    const schema = readFileSync('services/appSchema.ts', 'utf8');
    const schemaVersion = schema.match(/APP_SCHEMA_VERSION\s*=\s*["'](\d{4})["']/)?.[1];
    const latestMigration = readdirSync('database/migrations')
      .map((entry) => entry.match(/^(\d{4})_/)?.[1])
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    expect(schemaVersion).toBe(latestMigration);
  });

  it('keeps case note link migration idempotent and referentially safe', () => {
    expect(existsSync('database/migrations/0024_case_note_links.sql')).toBe(true);
    const sql = migrationSql('database/migrations/0024_case_note_links.sql');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS case_note_links');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_case_note_links_note');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_case_note_links_target');
    expect(sql).toContain('case_note_id');
    expect(sql).toContain('target_type');
  });

  it('keeps legacy BEM migration fresh-install safe before the real table is created', () => {
    const sql = migrationSql('database/migrations/0015_bem_process.sql').replace(/\s+/g, ' ');
    const dummyTable = sql.indexOf('CREATE TABLE IF NOT EXISTS bem_processes ( id TEXT PRIMARY KEY, case_id TEXT );');
    const rename = sql.indexOf('ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500');
    const realTable = sql.lastIndexOf('CREATE TABLE IF NOT EXISTS bem_processes (');
    expect(dummyTable).toBeGreaterThanOrEqual(0);
    expect(rename).toBeGreaterThan(dummyTable);
    expect(realTable).toBeGreaterThan(rename);
  });
});
