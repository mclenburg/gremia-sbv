import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CASE_MEASURE_NOTES_REQUIRED_COLUMNS } from '../services/appSchema';
import { compareIndexSnapshot, compareTableSnapshot, createSqlSchemaSnapshot } from '../services/schemaSnapshotPolicy';

describe('Schema-Snapshot Fresh Install vs. Legacy-Migration 0.9.1', () => {
  it('hält case_measure_notes in Basisschema und Migration 0026 strukturgleich', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0026_case_measure_notes.sql', 'utf8'));

    const problems = [
      ...compareTableSnapshot(fresh, migrated, 'case_measure_notes'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_measure_notes_measure'),
      ...compareIndexSnapshot(fresh, migrated, 'idx_case_measure_notes_case'),
    ];

    expect(problems).toEqual([]);
    expect(fresh.tables.case_measure_notes.columns).toEqual(expect.arrayContaining([...CASE_MEASURE_NOTES_REQUIRED_COLUMNS]));
  });
});
