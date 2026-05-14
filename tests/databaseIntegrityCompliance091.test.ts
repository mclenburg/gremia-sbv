import { describe, expect, it } from 'vitest';
import { evaluateDatabaseIntegrity } from '../services/databaseIntegrityService';
import type { DatabaseAdapter } from '../services/databaseService';

class SchemaDb implements DatabaseAdapter {
  constructor(
    private readonly tables: Record<string, string[]>,
    private readonly schemaVersion = '0031',
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
  case_documents: ['id', 'case_id', 'filename', 'storage_path', 'sha256', 'extracted_text', 'document_key', 'iv', 'auth_tag', 'size_bytes', 'imported_at', 'extraction_quality', 'text_extraction_status', 'text_extracted_at', 'text_extractor_id', 'text_extraction_error', 'ocr_status', 'ocr_text', 'ocr_engine', 'ocr_started_at', 'ocr_completed_at', 'ocr_error', 'contains_health_data', 'created_at'],
  contacts: ['id'],
  deadlines: ['id', 'title', 'due_at', 'status'],
  protected_persons: ['id', 'first_name', 'last_name', 'employment_state', 'protection_status', 'lifecycle_state'],
  person_case_links: ['id', 'protected_person_id', 'case_file_id', 'link_state'],
  privacy_review_items: ['id', 'case_id', 'protected_person_id', 'reason', 'status', 'due_at'],
  personal_data_audit_log: ['id', 'sequence', 'occurred_at', 'actor', 'action', 'subject_type', 'purpose', 'previous_hash', 'entry_hash'],
  case_measure_notes: ['id', 'case_id', 'measure_type', 'measure_id', 'title', 'note_at', 'content', 'contains_health_data', 'confidential_level', 'created_at', 'updated_at'],
  case_search_index: ['id', 'case_id', 'source_type', 'source_id', 'source_label', 'title', 'content', 'updated_at', 'confidentiality', 'contains_health_data', 'extraction_quality', 'navigation_kind', 'navigation_id'],
  case_search_index_fts: ['index_id', 'title', 'content', 'keywords', 'source_label'],
  case_search_index_state: ['case_id', 'indexed_at', 'last_source_updated_at', 'source_count', 'updated_at'],
  case_document_ocr_jobs: ['id', 'document_id', 'case_id', 'status', 'attempts', 'created_at', 'updated_at'],
};

describe('database integrity status for compliance center', () => {
  it('reports ok when critical SBV schema elements are present', () => {
    const result = evaluateDatabaseIntegrity(new SchemaDb(completeSchema));

    expect(result.ok).toBe(true);
    expect(result.appliedSchemaVersion).toBe('0031');
    expect(result.missingTables).toEqual([]);
    expect(result.missingColumns).toEqual({});
    expect(result.repairRequired).toBe(false);
  });

  it('accepts the real person-link and privacy-review column names from schema 0031', () => {
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
