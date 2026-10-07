import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { MigrationInference } from '../../../services/migrations/migrationInference';
import { MigrationProcessSchemasA } from '../../../services/migrations/migrationProcessSchemasA';
import { openTestDatabase } from '../../helpers/openTestDatabase';

class InferenceProbe extends MigrationInference {
  supportsRecruitingContext(): boolean {
    return this.looksApplied('0047');
  }
}

class JournalSchemaProbe extends MigrationProcessSchemasA {
  createJournalSchema(): void {
    this.ensureActivityJournalSchema();
  }
}

function assertDuplicateJournalLinkRejected(db: DatabaseAdapter): void {
  db.prepare(`INSERT INTO activity_journal_entries
    (id, entry_date, time_mode, category, title, confidentiality_level, status, created_from, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'entry-1', '2026-05-01', 'none', 'documentation', 'Prüfung', 'normal', 'draft', 'manual', '2026-05-01T08:00:00.000Z', '2026-05-01T08:00:00.000Z',
  );
  const insertLink = db.prepare(`INSERT INTO activity_journal_links
    (id, entry_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)`);
  insertLink.run('link-1', 'entry-1', 'case', 'case-1', '2026-05-01T08:00:00.000Z');

  expect(() => insertLink.run('link-2', 'entry-1', 'case', 'case-1', '2026-05-01T08:00:00.000Z')).toThrow();
  expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM activity_journal_links').get()?.count).toBe(1);
}

describe('Migrationserkennung und Journalschema', () => {
  it('erkennt den Recruiting-Kontext nur, wenn ein echter Datensatz geschrieben werden kann', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      const inference = new InferenceProbe(db, '', '');

      expect(inference.supportsRecruitingContext()).toBe(true);
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM sbv_participation_violations').get()?.count).toBe(0);
    } finally {
      db.close();
    }
  });

  it('hält eine vorhandene Spalte ohne erlaubten Recruiting-Kontext nicht für Migration 0047', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(`CREATE TABLE sbv_participation_violations (
        id TEXT PRIMARY KEY, related_recruiting_participation_id TEXT,
        stage TEXT, status TEXT, violation_type TEXT,
        source_context_type TEXT CHECK(source_context_type IN ('case')),
        source_context_id TEXT, subject TEXT, measure_description TEXT,
        wrong_behavior TEXT, required_behavior TEXT, legal_basis TEXT,
        created_at TEXT, updated_at TEXT
      )`);

      expect(new InferenceProbe(db, '', '').supportsRecruitingContext()).toBe(false);
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM sbv_participation_violations').get()?.count).toBe(0);
    } finally {
      db.close();
    }
  });

  it.each(['Basisschema', 'ensureSchema'] as const)('weist doppelte Journalverknüpfungen im %s zurück', async (schema) => {
    const db = await openTestDatabase();
    try {
      if (schema === 'Basisschema') db.exec(readFileSync('database/schema.sql', 'utf8'));
      else new JournalSchemaProbe(db, '', '').createJournalSchema();

      assertDuplicateJournalLinkRejected(db);
    } finally {
      db.close();
    }
  });
});
