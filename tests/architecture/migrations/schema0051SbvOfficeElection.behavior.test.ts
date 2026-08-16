import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSqlSchemaSnapshot, compareTableSnapshot } from '../../../services/schemaSnapshotPolicy';
import { DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS, SBV_OFFICE_0051_REQUIRED_TABLES } from '../../../services/appSchema';

describe('schema 0051 SBV office and election foundation', () => {
  it('keeps every new aggregate structurally aligned between fresh schema and upgrade migration', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const migrated = createSqlSchemaSnapshot(readFileSync('database/migrations/0051_sbv_office_election_foundation.sql', 'utf8'));
    const problems = Object.keys(SBV_OFFICE_0051_REQUIRED_TABLES).flatMap((table) => compareTableSnapshot(fresh, migrated, table));
    expect(problems).toEqual([]);
    for (const [table, columns] of Object.entries(SBV_OFFICE_0051_REQUIRED_TABLES)) {
      expect(fresh.tables[table]?.columns).toEqual(expect.arrayContaining([...columns]));
    }
    expect(fresh.tables.deadlines.columns).toEqual(expect.arrayContaining([...DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS]));
  });

  it('has no schema relation capable of storing an individual voter-to-candidate vote', () => {
    const fresh = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));
    const voteTotals = fresh.tables.sbv_election_vote_totals.columns;
    expect(voteTotals).toEqual(expect.arrayContaining(['election_id', 'office_type', 'candidate_id', 'votes']));
    expect(voteTotals).not.toContain('voter_id');
    expect(fresh.tables.sbv_election_voters.columns).not.toContain('candidate_id');
  });
});
