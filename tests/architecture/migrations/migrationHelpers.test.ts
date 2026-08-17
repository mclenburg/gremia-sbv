import { describe, expect, it, vi } from 'vitest';
import {
  getVersionFromFilename,
  isAlterAddColumnStatement,
  normalizeSql,
  parseAddColumnStatement,
  splitSqlStatements
} from '../../../services/migrationService';
import { addColumnsIfMissing } from '../../../services/migrations/schemaColumnMigration';
import type { DatabaseAdapter } from '../../../services/databaseService';

describe('migration service helpers', () => {
  it('extracts schema versions from migration filenames', () => {
    expect(getVersionFromFilename('0011_retention_policy.sql')).toBe('0011');
    expect(getVersionFromFilename('not-a-migration.sql')).toBeNull();
  });

  it('normalizes SQL by removing BOM and line comments', () => {
    const normalized = normalizeSql('\uFEFF-- comment\nCREATE TABLE test(id TEXT);\n-- ignored');
    expect(normalized).toBe('CREATE TABLE test(id TEXT);');
  });

  it('splits SQL statements without splitting semicolons inside strings', () => {
    const statements = splitSqlStatements("INSERT INTO x VALUES ('a;b'); CREATE TABLE y(id TEXT);");
    expect(statements).toEqual(["INSERT INTO x VALUES ('a;b')", 'CREATE TABLE y(id TEXT)']);
  });

  it('detects ALTER TABLE ADD COLUMN statements for defensive migration', () => {
    const statement = 'ALTER TABLE deadlines ADD COLUMN confidential_title TEXT';
    expect(isAlterAddColumnStatement(statement)).toBe(true);
    expect(parseAddColumnStatement(statement)).toEqual({ table: 'deadlines', column: 'confidential_title' });
  });

  it('does not treat other ALTER statements as safe ADD COLUMN migrations', () => {
    expect(isAlterAddColumnStatement('ALTER TABLE deadlines RENAME TO old_deadlines')).toBe(false);
    expect(parseAddColumnStatement('CREATE TABLE x(id TEXT)')).toBeNull();
  });

  it('ergänzt nur tatsächlich fehlende Spalten und verschluckt keine Metadatenfehler', () => {
    const exec = vi.fn();
    const db = {
      exec,
      prepare: vi.fn(() => ({ all: () => [{ name: 'existing_column' }] })),
    } as unknown as DatabaseAdapter;

    addColumnsIfMissing(db, 'records', [
      ['existing_column', 'TEXT'],
      ['new_column', 'INTEGER NOT NULL DEFAULT 0'],
    ]);

    expect(exec).toHaveBeenCalledOnce();
    expect(exec).toHaveBeenCalledWith(
      'ALTER TABLE "records" ADD COLUMN "new_column" INTEGER NOT NULL DEFAULT 0',
    );

    const failingDb = {
      prepare: () => {
        throw new Error('Schema-Metadaten nicht lesbar');
      },
    } as unknown as DatabaseAdapter;
    expect(() => addColumnsIfMissing(failingDb, 'records', [['new_column', 'TEXT']]))
      .toThrow('Schema-Metadaten nicht lesbar');
  });
});
