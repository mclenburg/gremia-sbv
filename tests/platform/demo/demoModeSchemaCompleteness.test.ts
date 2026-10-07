import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CASE_MEASURES_REQUIRED_COLUMNS } from '../../../services/appSchema';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { MigrationProcessSchemasA } from '../../../services/migrations/migrationProcessSchemasA';
import { openTestDatabase } from '../../helpers/openTestDatabase';

const handoverColumns = [
  'handover_import_id',
  'handover_package_id',
  'handover_valid_until',
  'handover_status',
  'handover_continue_confirmed_at',
  'handover_continue_reason',
] as const;

class CaseHandoverSchemaProbe extends MigrationProcessSchemasA {
  repair(): void {
    this.ensureCaseHandoverSchema();
  }
}

function columns(db: DatabaseAdapter, table: string): string[] {
  return db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all().map(({ name }) => name);
}

function createLegacyCaseTables(db: DatabaseAdapter): void {
  db.exec('CREATE TABLE cases (id TEXT PRIMARY KEY); CREATE TABLE case_measures (id TEXT PRIMARY KEY);');
}

describe('Demo-Modus Schema-Vollständigkeit', () => {
  it('legt frische Demo-Tresore mit dem vollständigen case_measures-App-Schema an', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      expect(columns(db, 'case_measures')).toEqual(expect.arrayContaining([...CASE_MEASURES_REQUIRED_COLUMNS]));
      expect(columns(db, 'case_measures')).toEqual(expect.arrayContaining([...handoverColumns]));
    } finally {
      db.close();
    }
  });

  it('rüstet Fallübergabespalten durch Migration 0036 in einer älteren Datenbank nach', async () => {
    const db = await openTestDatabase();
    try {
      createLegacyCaseTables(db);
      db.exec(readFileSync('database/migrations/0036_case_handover_transfer.sql', 'utf8'));
      expect(columns(db, 'case_measures')).toEqual(expect.arrayContaining([...handoverColumns]));
      expect(columns(db, 'cases')).toEqual(expect.arrayContaining([...handoverColumns]));
    } finally {
      db.close();
    }
  });

  it('ergänzt fehlende Spalten in älteren Fallmaßnahmen ohne vorhandene Spalten zu beschädigen', async () => {
    const db = await openTestDatabase();
    try {
      createLegacyCaseTables(db);
      db.exec("ALTER TABLE case_measures ADD COLUMN handover_status TEXT NOT NULL DEFAULT 'none'");
      const repair = new CaseHandoverSchemaProbe(db, '', '');
      repair.repair();
      repair.repair();
      expect(columns(db, 'case_measures')).toEqual(expect.arrayContaining([...handoverColumns]));
      expect(columns(db, 'case_measures').filter((column) => column === 'handover_status')).toHaveLength(1);
      expect(columns(db, 'cases')).toEqual(expect.arrayContaining([...handoverColumns]));
    } finally {
      db.close();
    }
  });
});
