import type { DatabaseAdapter } from './databaseService.js';
import { APP_SCHEMA_VERSION } from './appSchema.js';
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
] as const;

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  cases: ['id', 'case_number', 'display_name', 'category', 'status', 'protected_person_id', 'person_binding_state'],
  case_documents: ['id', 'case_id', 'filename', 'storage_path', 'sha256', 'extracted_text', 'document_key', 'iv', 'auth_tag', 'size_bytes', 'imported_at', 'extraction_quality', 'text_extraction_status', 'text_extracted_at', 'text_extractor_id', 'text_extraction_error', 'ocr_status', 'ocr_text', 'ocr_engine', 'ocr_started_at', 'ocr_completed_at', 'ocr_error', 'contains_health_data', 'created_at'],
  protected_persons: ['id', 'first_name', 'last_name', 'employment_state', 'protection_status', 'lifecycle_state'],
  person_case_links: ['id', 'protected_person_id', 'case_file_id', 'link_state'],
  privacy_review_items: ['id', 'case_id', 'protected_person_id', 'reason', 'status', 'due_at'],
  personal_data_audit_log: ['id', 'sequence', 'occurred_at', 'actor', 'action', 'subject_type', 'purpose', 'previous_hash', 'entry_hash'],
  case_measure_notes: ['id', 'case_id', 'measure_type', 'measure_id', 'title', 'note_at', 'content', 'contains_health_data', 'confidential_level', 'created_at', 'updated_at'],
  deadlines: ['id', 'title', 'due_at', 'status'],
  case_search_index: ['id', 'case_id', 'source_type', 'source_id', 'source_label', 'title', 'content', 'updated_at', 'confidentiality', 'contains_health_data', 'extraction_quality', 'navigation_kind', 'navigation_id'],
  case_search_index_state: ['case_id', 'indexed_at', 'last_source_updated_at', 'source_count', 'updated_at'],
  case_document_ocr_jobs: ['id', 'document_id', 'case_id', 'status', 'attempts', 'created_at', 'updated_at'],
  gremia_br_settings: ['id', 'enabled', 'server_url', 'username', 'password_secret', 'last_connection_test_at', 'last_successful_login_at', 'profile_json', 'relevance_keywords_json', 'created_at', 'updated_at'],
  gremia_br_cache_entries: ['id', 'cache_key', 'source_type', 'payload_json', 'fetched_at', 'created_at', 'updated_at'],
  case_external_references: ['id', 'case_id', 'source_system', 'source_type', 'source_id', 'title', 'fetched_at', 'created_at', 'updated_at'],
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
