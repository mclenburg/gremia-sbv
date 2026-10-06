import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS, SBV_OFFICE_0051_REQUIRED_TABLES } from '../../../services/appSchema';

function tableColumns(db: DatabaseSync, table: string): string[] {
  return db.prepare('SELECT name FROM pragma_table_info(?) ORDER BY cid').all(table)
    .map((column) => String(column.name));
}

function openFreshAndMigrated(): { fresh: DatabaseSync; migrated: DatabaseSync } {
  const fresh = new DatabaseSync(':memory:');
  const migrated = new DatabaseSync(':memory:');
  try {
    fresh.exec(readFileSync('database/schema.sql', 'utf8'));
    migrated.exec('CREATE TABLE case_measure_workplace_accommodation (id TEXT PRIMARY KEY); CREATE TABLE deadlines (id TEXT PRIMARY KEY);');
    migrated.exec(readFileSync('database/migrations/0051_sbv_office_election_foundation.sql', 'utf8'));
    return { fresh, migrated };
  } catch (error) {
    fresh.close();
    migrated.close();
    throw error;
  }
}

describe('schema 0051 SBV office and election foundation', () => {
  it('creates the same office and election columns on fresh install and upgrade', () => {
    const { fresh, migrated } = openFreshAndMigrated();
    try {
      for (const [table, requiredColumns] of Object.entries(SBV_OFFICE_0051_REQUIRED_TABLES)) {
        const freshColumns = tableColumns(fresh, table);
        expect(freshColumns, table).toEqual(tableColumns(migrated, table));
        expect(freshColumns, table).toEqual(expect.arrayContaining([...requiredColumns]));
      }
      expect(tableColumns(fresh, 'deadlines')).toEqual(expect.arrayContaining([...DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS]));
      expect(tableColumns(migrated, 'deadlines')).toEqual(expect.arrayContaining([...DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS]));
    } finally {
      fresh.close();
      migrated.close();
    }
  });

  it('cannot persist an individual voter-to-candidate vote in either schema', () => {
    const { fresh, migrated } = openFreshAndMigrated();
    try {
      for (const db of [fresh, migrated]) {
        expect(tableColumns(db, 'sbv_election_vote_totals')).toEqual(expect.arrayContaining(['election_id', 'office_type', 'candidate_id', 'votes']));
        expect(tableColumns(db, 'sbv_election_vote_totals')).not.toContain('voter_id');
        expect(tableColumns(db, 'sbv_election_voters')).not.toContain('candidate_id');
      }
    } finally {
      fresh.close();
      migrated.close();
    }
  });
});
