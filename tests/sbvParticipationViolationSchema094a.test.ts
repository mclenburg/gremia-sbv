import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_SCHEMA_VERSION } from '../services/appSchema';

const migration = readFileSync('database/migrations/0042_sbv_participation_violations.sql', 'utf8');
const measureContextMigration = readFileSync('database/migrations/0044_participation_violation_measure_context.sql', 'utf8');
const schema = readFileSync('database/schema.sql', 'utf8');

describe('Beteiligungsverstoß-Schema 0.9.4-a', () => {
  it('führt 0042 als nächste Migration nach dem Tätigkeitsjournal ein', () => {
    expect(APP_SCHEMA_VERSION).toBe('0044');
    expect(migration).toContain('sbv_participation_violations');
    expect(migration).toContain("REFERENCES activity_journal_entries(id) ON DELETE SET NULL");
    expect(migration).not.toContain('INSERT INTO schema_migrations');
  });

  it('begrenzt source_context_type per CHECK und schützt Relationen per ON DELETE SET NULL', () => {
    expect(migration).toContain("source_context_type TEXT NOT NULL CHECK");
    for (const value of ['case', 'sbv_participation', 'termination_hearing', 'sbv_control_protocol', 'deadline', 'activity_journal']) {
      expect(migration).toContain(`'${value}'`);
    }
    expect(migration).toContain('case_id TEXT REFERENCES cases(id) ON DELETE SET NULL');
    expect(migration).toContain('related_deadline_id TEXT REFERENCES deadlines(id) ON DELETE SET NULL');
    expect(migration).toContain('related_activity_journal_entry_id TEXT REFERENCES activity_journal_entries(id) ON DELETE SET NULL');
  });

  it('führt 0044 als Maßnahmennachrüstung für case_measure_participation ein', () => {
    expect(measureContextMigration).toContain('related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL');
    expect(measureContextMigration).toContain("'case_measure_participation'");
    expect(schema).toContain('related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL');
    expect(schema).toContain("'case_measure_participation'");
  });

  it('erweitert generated_documents für den späteren DOCX-Generator, ohne case_documents zu missbrauchen', () => {
    expect(migration).toContain('ALTER TABLE generated_documents ADD COLUMN violation_id TEXT');
    expect(migration).toContain('document_kind TEXT');
    expect(migration).toContain("'sbv_participation_violation'");
    expect(migration).toContain('template_version TEXT');
    expect(migration).not.toContain('case_documents ADD COLUMN violation_id');
  });

  it('hält Fresh-Schema und Migration fachlich synchron', () => {
    for (const table of ['sbv_participation_violations', 'sbv_participation_violation_events', 'sbv_participation_violation_documents']) {
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(schema).toContain('document_kind TEXT CHECK');
    expect(schema).toContain('template_version TEXT');
  });
});
