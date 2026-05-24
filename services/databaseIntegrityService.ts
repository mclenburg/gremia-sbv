import type { DatabaseAdapter } from './databaseService.js';
import {
  APP_SCHEMA_VERSION,
  CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS,
  CASE_DOCUMENTS_REQUIRED_COLUMNS,
  COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS,
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
  SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS,
} from './appSchema.js';
import type { ComplianceDatabaseIntegrityStatus } from '../src/app/core/models/compliance.model.js';

type ValueRow = { value?: unknown };
type NameRow = { name?: unknown };

const REQUIRED_TABLES = [
  'schema_migrations',
  'cases',
  'case_notes',
  'case_documents',
  'contacts',
  'deadlines',
  'protected_persons',
  'person_case_links',
  'privacy_review_items',
  'personal_data_audit_log',
  'case_measure_notes',
  'case_search_index',
  'case_search_index_fts',
  'case_search_index_state',
  'case_document_ocr_jobs',
  'gremia_br_settings',
  'gremia_br_cache_entries',
  'case_external_references',
  'case_measures',
  'case_handover_imports',
  'case_handover_import_items',
  'sbv_resource_records',
  'compliance_incidents',
] as const;

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  cases: CASES_REQUIRED_COLUMNS,
  case_documents: CASE_DOCUMENTS_REQUIRED_COLUMNS,
  protected_persons: PROTECTED_PERSONS_REQUIRED_COLUMNS,
  person_case_links: ['id', 'protected_person_id', 'case_file_id', 'link_state'],
  privacy_review_items: ['id', 'case_id', 'protected_person_id', 'reason', 'status', 'due_at'],
  personal_data_audit_log: PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS,
  case_measure_notes: CASE_MEASURE_NOTES_REQUIRED_COLUMNS,
  deadlines: ['id', 'title', 'due_at', 'status'],
  case_search_index: CASE_SEARCH_INDEX_REQUIRED_COLUMNS,
  case_search_index_state: CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS,
  case_document_ocr_jobs: CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS,
  gremia_br_settings: GREMIA_BR_SETTINGS_REQUIRED_COLUMNS,
  gremia_br_cache_entries: GREMIA_BR_CACHE_REQUIRED_COLUMNS,
  case_external_references: CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS,
  case_measures: CASE_MEASURES_REQUIRED_COLUMNS,
  case_handover_imports: CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS,
  case_handover_import_items: CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS,
  sbv_resource_records: SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS,
  compliance_incidents: COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS,
};

function tableExists(db: DatabaseAdapter, table: string): boolean {
  const row = db.prepare<ValueRow>(
    "SELECT 1 AS value FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?",
  ).get(table);
  return Number(row?.value ?? 0) === 1;
}

function tableColumns(db: DatabaseAdapter, table: string): string[] {
  if (!tableExists(db, table)) return [];
  return db.prepare<NameRow>(`PRAGMA table_info(${table})`).all()
    .map((row) => String(row.name ?? ''))
    .filter(Boolean);
}

function currentMigrationVersion(db: DatabaseAdapter): string | undefined {
  if (!tableExists(db, 'schema_migrations')) return undefined;
  const row = db.prepare<ValueRow>('SELECT MAX(version) AS value FROM schema_migrations').get();
  const value = row?.value;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isMissingRequiredColumnIssue(issue: string): boolean {
  return issue.startsWith('Spalte ');
}

export function evaluateDatabaseIntegrity(db: DatabaseAdapter): ComplianceDatabaseIntegrityStatus {
  const missingTables: string[] = [];
  const missingColumns: Record<string, string[]> = {};
  const issues: string[] = [];

  for (const table of REQUIRED_TABLES) {
    if (!tableExists(db, table)) {
      missingTables.push(table);
      issues.push(`Tabelle ${table} fehlt.`);
    }
  }

  for (const [table, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
    const existingColumns = new Set(tableColumns(db, table));
    const tableMissingColumns = requiredColumns.filter((column) => !existingColumns.has(column));
    if (tableMissingColumns.length > 0) {
      missingColumns[table] = tableMissingColumns;
      for (const column of tableMissingColumns) {
        issues.push(`Spalte ${table}.${column} fehlt.`);
      }
    }
  }

  const appliedSchemaVersion = currentMigrationVersion(db);
  if (!appliedSchemaVersion) {
    issues.push('Schema-Migrationsstand konnte nicht gelesen werden.');
  } else if (appliedSchemaVersion !== APP_SCHEMA_VERSION) {
    issues.push(`Schema-Migrationsstand ${appliedSchemaVersion} weicht von ${APP_SCHEMA_VERSION} ab.`);
  }

  const hasStructuralGap = missingTables.length > 0 || issues.some(isMissingRequiredColumnIssue);
  return {
    ok: issues.length === 0,
    schemaVersion: APP_SCHEMA_VERSION,
    appliedSchemaVersion,
    missingTables,
    missingColumns,
    issueCount: issues.length,
    issues,
    repairRequired: hasStructuralGap,
  };
}
