import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS,
  ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS,
  ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS,
  CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS,
  CASE_DOCUMENTS_REQUIRED_COLUMNS,
  CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS,
  CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS,
  CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS,
  CASE_MEASURES_REQUIRED_COLUMNS,
  CASE_MEASURE_NOTES_REQUIRED_COLUMNS,
  CASE_SEARCH_INDEX_REQUIRED_COLUMNS,
  CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS,
  CASES_REQUIRED_COLUMNS,
  GREMIA_BR_CACHE_REQUIRED_COLUMNS,
  GREMIA_BR_SETTINGS_REQUIRED_COLUMNS,
  PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS,
  PROTECTED_PERSONS_REQUIRED_COLUMNS,
  SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS,
  SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS,
  COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS,
  GENERATED_DOCUMENTS_REQUIRED_COLUMNS,
  SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS,
  SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS,
  SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS,
} from '../services/appSchema';
import { evaluateDatabaseIntegrity } from '../services/databaseIntegrityService';
import type { DatabaseAdapter } from '../services/databaseService';

class SchemaDb implements DatabaseAdapter {
  constructor(
    private readonly tables: Record<string, readonly string[]>,
    private readonly schemaVersion = '0044',
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

const completeSchema: Record<string, readonly string[]> = {
  schema_migrations: ['version'],
  cases: CASES_REQUIRED_COLUMNS,
  case_notes: ['id'],
  case_documents: CASE_DOCUMENTS_REQUIRED_COLUMNS,
  generated_documents: GENERATED_DOCUMENTS_REQUIRED_COLUMNS,
  contacts: ['id'],
  deadlines: ['id', 'title', 'due_at', 'status'],
  protected_persons: PROTECTED_PERSONS_REQUIRED_COLUMNS,
  person_case_links: ['id', 'protected_person_id', 'case_file_id', 'link_state'],
  privacy_review_items: ['id', 'case_id', 'protected_person_id', 'reason', 'status', 'due_at'],
  personal_data_audit_log: PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS,
  case_measure_notes: CASE_MEASURE_NOTES_REQUIRED_COLUMNS,
  case_search_index: CASE_SEARCH_INDEX_REQUIRED_COLUMNS,
  case_search_index_fts: ['index_id', 'title', 'content', 'keywords', 'source_label'],
  case_search_index_state: CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS,
  case_document_ocr_jobs: CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS,
  gremia_br_settings: GREMIA_BR_SETTINGS_REQUIRED_COLUMNS,
  gremia_br_cache_entries: GREMIA_BR_CACHE_REQUIRED_COLUMNS,
  case_external_references: CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS,
  case_measures: CASE_MEASURES_REQUIRED_COLUMNS,
  case_handover_imports: CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS,
  case_handover_import_items: CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS,
  sbv_resource_records: SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS,
  sbv_control_protocols: SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS,
  compliance_incidents: COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS,
  activity_journal_entries: ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS,
  activity_journal_links: ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS,
  activity_journal_category_preferences: ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS,
  sbv_participation_violations: SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS,
  sbv_participation_violation_events: SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS,
  sbv_participation_violation_documents: SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS,
};

describe('database integrity status for compliance center', () => {
  it('reports ok when critical SBV schema elements are present', () => {
    const result = evaluateDatabaseIntegrity(new SchemaDb(completeSchema));

    expect(result.ok).toBe(true);
    expect(result.appliedSchemaVersion).toBe('0044');
    expect(result.missingTables).toEqual([]);
    expect(result.missingColumns).toEqual({});
    expect(result.repairRequired).toBe(false);
  });

  it('accepts the real person-link and privacy-review column names through schema 0042', () => {
    const result = evaluateDatabaseIntegrity(new SchemaDb(completeSchema));

    expect(result.issues).not.toContain('Spalte person_case_links.person_id fehlt.');
    expect(result.issues).not.toContain('Spalte person_case_links.case_id fehlt.');
    expect(result.issues).not.toContain('Spalte privacy_review_items.trigger fehlt.');
  });

  it('reports repair need when a migration marker exists but a critical handover column is missing', () => {
    const brokenSchema = {
      ...completeSchema,
      cases: completeSchema.cases.filter((column) => column !== 'handover_valid_until'),
    };

    const result = evaluateDatabaseIntegrity(new SchemaDb(brokenSchema));

    expect(result.ok).toBe(false);
    expect(result.repairRequired).toBe(true);
    expect(result.missingColumns.cases).toContain('handover_valid_until');
    expect(result.issues).toContain('Spalte cases.handover_valid_until fehlt.');
  });

  it('reports repair need when the handover import tables through schema 0042 are missing', () => {
    const { case_handover_imports: _imports, case_handover_import_items: _items, ...brokenSchema } = completeSchema;

    const result = evaluateDatabaseIntegrity(new SchemaDb(brokenSchema));

    expect(result.ok).toBe(false);
    expect(result.repairRequired).toBe(true);
    expect(result.missingTables).toEqual(['case_handover_imports', 'case_handover_import_items']);
  });
});
