import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

function schemaVersion(source: string): number {
  const match = source.match(/APP_SCHEMA_VERSION\s*=\s*['"](\d+)['"]/);
  if (!match) throw new Error('APP_SCHEMA_VERSION not found');
  return Number(match[1]);
}

describe('0.8.12 case note links migration', () => {
  it('creates the persistent case_note_links table idempotently', () => {
    const migration = readNormalizedSourceText('database/migrations/0024_case_note_links.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS case_note_links');
    expect(migration).toContain('target_type TEXT NOT NULL');
    expect(migration).toContain("CHECK (target_type IN ('bem', 'participation', 'deadline'))");
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_case_note_links_note');
  });

  it('keeps the app schema version at least at the case-note-link migration level', () => {
    const schema = readNormalizedSourceText('services/appSchema.ts');
    expect(schemaVersion(schema)).toBeGreaterThanOrEqual(24);
  });
});
