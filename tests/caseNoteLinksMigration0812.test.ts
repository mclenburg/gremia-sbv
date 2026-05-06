import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 case note links migration', () => {
  it('creates the persistent case_note_links table idempotently', () => {
    const migration = readFileSync('database/migrations/0024_case_note_links.sql', 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS case_note_links');
    expect(migration).toContain('target_type TEXT NOT NULL');
    expect(migration).toContain("CHECK (target_type IN ('bem', 'participation', 'deadline'))");
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_case_note_links_note');
  });

  it('raises the app schema version because a database migration is added', () => {
    const schema = readFileSync('services/appSchema.ts', 'utf8');
    expect(schema).toContain("APP_SCHEMA_VERSION = '0024'");
  });
});
