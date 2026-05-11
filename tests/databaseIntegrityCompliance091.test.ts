import { describe, expect, it } from 'vitest';
import { evaluateDatabaseIntegrity } from '../services/databaseIntegrityService';
import type { DatabaseAdapter } from '../services/databaseService';

class SchemaDb implements DatabaseAdapter {
  constructor(
    private readonly tables: Record<string, string[]>,
    private readonly schemaVersion = '0025',
  ) {}

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(..._params: unknown[]): T[] {
        const tableInfo = sql.match(/^PRAGMA table_info\(([^)]+)\)$/i);
        if (tableInfo) {
          const table = tableInfo[1];
          return (self.tables[table] ?? []).map((name) => ({ name })) as T[];
        }
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (sql.includes('sqlite_master')) {
          const table = String(params[0] ?? '');
          return (self.tables[table] ? { value: 1 } : undefined) as T | undefined;
        }
        if (sql.includes('MAX(version)')) {
          return { value: self.schemaVersion } as T;
        }
        return undefined;
      },
      run(..._params: unknown[]) {
        return {};
      },
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

const completeSchema: Record<string, string[]> = {
  schema_migrations: ['version'],
  cases: ['id', 'case_number', 'display_name', 'category', 'status', 'protected_person_id', 'person_binding_state'],
  case_notes: ['id'],
  case_documents: ['id'],
  contacts: ['id'],
  deadlines: ['id', 'title', 'due_at', 'status'],
  protected_persons: ['id', 'first_name', 'last_name', 'employment_state', 'protection_status', 'lifecycle_state'],
  person_case_links: ['id', 'protected_person_id', 'case_file_id', 'link_state'],
  privacy_review_items: ['id', 'case_id', 'protected_person_id', 'reason', 'status', 'due_at'],
  personal_data_audit_log: ['id', 'sequence', 'occurred_at', 'actor', 'action', 'subject_type', 'purpose', 'previous_hash', 'entry_hash'],
};

describe('database integrity status for compliance center', () => {
  it('reports ok when critical SBV schema elements are present', () => {
    const result = evaluateDatabaseIntegrity(new SchemaDb(completeSchema));

    expect(result.ok).toBe(true);
    expect(result.appliedSchemaVersion).toBe('0025');
    expect(result.missingTables).toEqual([]);
    expect(result.missingColumns).toEqual({});
    expect(result.repairRequired).toBe(false);
  });

  it('accepts the real person-link and privacy-review column names from schema 0025', () => {
    const result = evaluateDatabaseIntegrity(new SchemaDb(completeSchema));

    expect(result.issues).not.toContain('Spalte person_case_links.person_id fehlt.');
    expect(result.issues).not.toContain('Spalte person_case_links.case_id fehlt.');
    expect(result.issues).not.toContain('Spalte privacy_review_items.trigger fehlt.');
  });

  it('reports repair need when a migration marker exists but a critical column is missing', () => {
    const brokenSchema = {
      ...completeSchema,
      cases: completeSchema.cases.filter((column) => column !== 'protected_person_id'),
    };

    const result = evaluateDatabaseIntegrity(new SchemaDb(brokenSchema));

    expect(result.ok).toBe(false);
    expect(result.repairRequired).toBe(true);
    expect(result.missingColumns.cases).toContain('protected_person_id');
    expect(result.issues).toContain('Spalte cases.protected_person_id fehlt.');
  });
});
