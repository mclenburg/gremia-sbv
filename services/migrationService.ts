import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { classifyCaseLegalReferencesColumns } from './knowledgeMigrationPolicy.js';
import { APP_VERSION } from './generated/appMetadata.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from './appSchema.js';

interface MigrationRow {
  version: string;
  filename: string;
  checksum: string;
  applied_at: string;
  app_version?: string | null;
  mode?: string | null;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  inferred: string[];
  currentSchemaVersion: string;
  diagnostics: string[];
}

interface MigrationDefinition {
  version: string;
  filename: string;
  path: string;
  checksum: string;
}

const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  app_version TEXT,
  mode TEXT NOT NULL DEFAULT 'sql',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS schema_migration_log (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
`;

function nowIso(): string {
  return new Date().toISOString();
}

function checksum(content: string): string {
  let hash = 5381;
  for (let index = 0; index < content.length; index += 1) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeSql(sql: string): string {
  return sql
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const previous = index > 0 ? sql[index - 1] : '';

    if (char === "'" && quote !== 'double' && previous !== '\\') {
      quote = quote === 'single' ? null : 'single';
    } else if (char === '"' && quote !== 'single' && previous !== '\\') {
      quote = quote === 'double' ? null : 'double';
    }

    if (char === ';' && quote === null) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
    } else {
      current += char;
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function getVersionFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4})[_-].+\.sql$/i);
  return match?.[1] ?? null;
}

export function isAlterAddColumnStatement(statement: string): boolean {
  return /^ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN\s+/i.test(statement.trim());
}

export function parseAddColumnStatement(statement: string): { table: string; column: string } | null {
  const match = statement.trim().match(/^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\b/i);
  if (!match) return null;
  return { table: match[1], column: match[2] };
}

function isCreateIndexStatement(statement: string): boolean {
  return /^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+/i.test(statement.trim());
}

function rowToBoolean(row: unknown): boolean {
  return Boolean((row as { found?: number } | undefined)?.found);
}

export class MigrationService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly schemaPath: string,
    private readonly migrationsDir: string
  ) {}

  migrate(): MigrationResult {
    const applied: string[] = [];
    const skipped: string[] = [];
    const inferred: string[] = [];
    const diagnostics: string[] = [];

    this.ensureMigrationTables();

    if (this.isFreshDatabase()) {
      this.applyBaseSchema();
      const definitions = this.listMigrationDefinitions();
      definitions.forEach((definition) => {
        this.recordMigration(definition, 'baseline', 'Frische Datenbank wurde über database/schema.sql auf aktuellen Stand initialisiert.');
        inferred.push(definition.filename);
      });
      this.repairKnownSchemaDrift(diagnostics);
      this.validateRequiredSchema(diagnostics);
      this.writeSchemaSettings(APP_SCHEMA_VERSION);
      return { applied, skipped, inferred, currentSchemaVersion: APP_SCHEMA_VERSION, diagnostics };
    }

    this.inferAlreadyAppliedMigrations(inferred);

    const definitions = this.listMigrationDefinitions();
    definitions.forEach((definition) => {
      if (this.hasMigration(definition.version)) {
        skipped.push(definition.filename);
        return;
      }

      this.applyMigration(definition);
      applied.push(definition.filename);
    });

    this.repairKnownSchemaDrift(diagnostics);
    this.validateRequiredSchema(diagnostics);
    this.writeSchemaSettings(APP_SCHEMA_VERSION);
    return { applied, skipped, inferred, currentSchemaVersion: this.currentSchemaVersion(), diagnostics };
  }

  private ensureMigrationTables(): void {
    this.db.exec(MIGRATION_TABLE_SQL);
  }

  private isFreshDatabase(): boolean {
    const rows = this.db.prepare<{ name: string }>(`
      SELECT name FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND name NOT LIKE 'sqlite_%'
        AND name NOT IN ('schema_migrations', 'schema_migration_log')
    `).all();
    return rows.length === 0;
  }

  private applyBaseSchema(): void {
    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(`Basisschema nicht gefunden: ${this.schemaPath}`);
    }
    const schemaSql = fs.readFileSync(this.schemaPath, 'utf8');
    this.db.exec(schemaSql);
    this.ensureMigrationTables();
  }

  private listMigrationDefinitions(): MigrationDefinition[] {
    if (!fs.existsSync(this.migrationsDir)) return [];

    return fs.readdirSync(this.migrationsDir)
      .filter((file) => /^\d{4}[_-].+\.sql$/i.test(file))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => {
        const fullPath = path.join(this.migrationsDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        return {
          version: getVersionFromFilename(file) ?? file,
          filename: file,
          path: fullPath,
          checksum: checksum(content)
        };
      });
  }

  private inferAlreadyAppliedMigrations(inferred: string[]): void {
    const definitions = this.listMigrationDefinitions();
    definitions.forEach((definition) => {
      if (this.hasMigration(definition.version)) return;
      if (!this.looksApplied(definition.version)) return;
      this.recordMigration(definition, 'inferred', 'Migration wurde aus vorhandener Datenbankstruktur erkannt und nachträglich als angewendet markiert.');
      inferred.push(definition.filename);
    });
  }

  private looksApplied(version: string): boolean {
    switch (version) {
      case '0002':
        return this.tableExists('bem_processes') && this.tableExists('termination_hearings') && this.tableExists('portable_profile');
      case '0003':
        return this.tableExists('deadline_templates') && this.columnExists('deadlines', 'deadline_type') && this.columnExists('deadlines', 'confidential_title');
      case '0004':
        return this.tableExists('case_notes_fts') && this.tableExists('case_documents_fts');
      case '0005':
        return this.indexExists('idx_case_documents_case_id');
      case '0006':
        return this.tableExists('case_note_cases');
      case '0007':
        return this.tableExists('contacts') && this.columnExists('contacts', 'first_name') && this.columnExists('contacts', 'last_name');
      case '0008':
        return this.tableExists('contact_text_references');
      case '0009':
        return this.tableExists('schema_migrations');
      case '0010':
        return this.tableExists('report_exports');
      case '0011':
        return this.tableExists('retention_actions');
      case '0012':
        return this.tableExists('prevention_processes') && this.tableExists('prevention_process_contacts');
      case '0013':
        return this.tableExists('legal_norms') && this.tableExists('case_legal_references') && this.columnExists('case_legal_references', 'legal_norm_id') && this.tableExists('norm_checklist_items');
      case '0014':
        return this.tableExists('document_templates') && this.tableExists('template_renders');
      case '0015':
        return this.tableExists('bem_processes')
          && this.columnExists('bem_processes', 'status')
          && this.columnExists('bem_processes', 'title')
          && this.columnExists('bem_processes', 'employee_response')
          && this.tableExists('bem_process_contacts')
          && this.tableExists('bem_process_events');
      case '0016':
        return this.columnExists('bem_processes', 'privacy_notice_at')
          && this.columnExists('bem_processes', 'consent_scope')
          && this.columnExists('bem_processes', 'measure_owners')
          && this.columnExists('bem_processes', 'completion_reason');
      case '0017':
        return this.tableExists('termination_hearings')
          && this.columnExists('termination_hearings', 'status')
          && this.columnExists('termination_hearings', 'received_at')
          && this.columnExists('termination_hearings', 'protection_status')
          && this.indexExists('idx_termination_hearings_status');
      case '0018':
        return this.tableExists('personal_data_audit_log')
          && this.columnExists('personal_data_audit_log', 'entry_hash')
          && this.indexExists('idx_personal_data_audit_action');
      case '0019':
        return this.tableExists('sbv_participations')
          && this.columnExists('sbv_participations', 'hearing_before_decision')
          && this.indexExists('idx_sbv_participations_status');
      case '0025':
        return this.tableExists('protected_persons')
          && this.tableExists('person_import_runs')
          && this.tableExists('person_import_run_items')
          && this.tableExists('person_case_links')
          && this.tableExists('privacy_review_items')
          && this.columnExists('protected_persons', 'left_company_at')
          && this.columnExists('protected_persons', 'record_kind')
          && this.columnExists('cases', 'protected_person_id')
          && this.columnExists('cases', 'person_binding_state')
          && this.columnExists('cases', 'privacy_review_required');
      case '0026':
        return this.tableExists('case_measure_notes')
          && this.columnExists('case_measure_notes', 'measure_type')
          && this.columnExists('case_measure_notes', 'measure_id')
          && this.columnExists('case_measure_notes', 'content');
      case '0027':
        return this.tableExists('case_search_index')
          && this.tableExists('case_search_index_fts')
          && CASE_SEARCH_INDEX_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index', column));
      case '0028':
        return CASE_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_documents', column));
      case '0029':
        return this.tableExists('case_search_index_state')
          && CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index_state', column));
      case '0030':
        return CASE_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_documents', column));
      case '0031':
        return CASE_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_documents', column))
          && this.tableExists('case_document_ocr_jobs')
          && CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_document_ocr_jobs', column));
      case '0032':
        return this.tableExists('gremia_br_settings')
          && GREMIA_BR_SETTINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_settings', column));
      case '0033':
        return this.tableExists('gremia_br_cache_entries')
          && GREMIA_BR_CACHE_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_cache_entries', column));
      case '0034':
        return this.tableExists('gremia_br_settings')
          && GREMIA_BR_SETTINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_settings', column));
      case '0035':
        return this.tableExists('case_external_references')
          && CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_external_references', column));
      case '0036':
        return this.tableExists('case_handover_imports')
          && this.tableExists('case_handover_import_items')
          && CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_imports', column))
          && CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_import_items', column))
          && ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'].every((column) => this.columnExists('cases', column))
          && ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'].every((column) => this.columnExists('case_measures', column));
      case '0037':
        return this.tableExists('sbv_resource_records')
          && SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_resource_records', column));
      case '0038':
        return this.tableExists('compliance_incidents')
          && COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('compliance_incidents', column));
      case '0039':
        return this.tableExists('sbv_control_protocols')
          && ['id', 'title', 'partner', 'topic', 'meeting_at', 'participants', 'legal_context', 'discussion', 'result', 'next_steps', 'status', 'created_at', 'updated_at'].every((column) => this.columnExists('sbv_control_protocols', column));
      case '0040':
        return this.tableExists('sbv_control_protocols')
          && SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_control_protocols', column));
      case '0041':
        return this.tableExists('activity_journal_entries')
          && this.tableExists('activity_journal_links')
          && this.tableExists('activity_journal_category_preferences')
          && ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_entries', column))
          && ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_links', column))
          && ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_category_preferences', column));
      case '0042':
        return this.tableExists('sbv_participation_violations')
          && this.tableExists('sbv_participation_violation_events')
          && this.tableExists('sbv_participation_violation_documents')
          && SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participation_violations', column))
          && SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participation_violation_events', column))
          && SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participation_violation_documents', column));
      case '0043':
        return GENERATED_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('generated_documents', column));
      default:
        return false;
    }
  }

  private applyMigration(definition: MigrationDefinition): void {
    const rawSql = fs.readFileSync(definition.path, 'utf8');
    const sql = normalizeSql(rawSql);

    try {
      this.db.exec('BEGIN');
      if (definition.version === '0003') {
        this.applyAddColumnsSafely(sql);
        this.executeStatements(sql, { skipAlterAddColumn: true });
      } else if (definition.version === '0007') {
        this.ensureContactsSchema();
        this.executeStatements(sql, { skipUnsafeCreateContacts: true });
      } else if (definition.version === '0013') {
        this.ensureKnowledgeSchemaCompatibility();
        this.applyAddColumnsSafely(sql);
        this.executeStatements(sql, { skipAlterAddColumn: true });
      } else {
        this.applyAddColumnsSafely(sql);
        this.executeStatements(sql, { skipAlterAddColumn: true });
      }
      this.recordMigration(definition, 'sql', 'Migration erfolgreich angewendet.');
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      this.logMigration(definition, 'failed', error instanceof Error ? error.message : String(error));
      throw new Error(`Migration ${definition.filename} fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private executeStatements(sql: string, options: { skipAlterAddColumn?: boolean; skipUnsafeCreateContacts?: boolean } = {}): void {
    const statements = splitSqlStatements(sql);
    statements.forEach((statement) => {
      const trimmed = statement.trim();
      if (!trimmed || trimmed.startsWith('--')) return;
      if (options.skipAlterAddColumn && isAlterAddColumnStatement(trimmed)) return;
      if (options.skipUnsafeCreateContacts && /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+contacts\s*\(/i.test(trimmed)) return;
      this.db.exec(`${trimmed};`);
    });
  }

  private applyAddColumnsSafely(sql: string): void {
    splitSqlStatements(sql).forEach((statement) => {
      if (!isAlterAddColumnStatement(statement)) return;
      const parsed = parseAddColumnStatement(statement);
      if (!parsed) return;
      if (!this.tableExists(parsed.table)) return;
      if (this.columnExists(parsed.table, parsed.column)) return;
      this.db.exec(`${statement.trim()};`);
    });
  }

  private ensureContactsSchema(): void {
    if (!this.tableExists('contacts')) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          organization TEXT,
          role TEXT,
          category TEXT NOT NULL DEFAULT 'sonstiges',
          email TEXT,
          phone TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return;
    }

    this.addColumnIfMissing('contacts', 'first_name', "TEXT NOT NULL DEFAULT ''");
    this.addColumnIfMissing('contacts', 'last_name', "TEXT NOT NULL DEFAULT ''");
    this.addColumnIfMissing('contacts', 'role', 'TEXT');
    this.addColumnIfMissing('contacts', 'email', 'TEXT');
    this.addColumnIfMissing('contacts', 'phone', 'TEXT');
    this.addColumnIfMissing('contacts', 'notes', 'TEXT');
    this.addColumnIfMissing('contacts', 'created_at', "TEXT NOT NULL DEFAULT (datetime('now'))");
    this.addColumnIfMissing('contacts', 'updated_at', "TEXT NOT NULL DEFAULT (datetime('now'))");
    this.addColumnIfMissing('contacts', 'category', "TEXT NOT NULL DEFAULT 'sonstiges'");
    this.addColumnIfMissing('contacts', 'organization', 'TEXT');

    if (this.columnExists('contacts', 'name')) {
      this.db.exec(`
        UPDATE contacts
        SET
          last_name = CASE
            WHEN TRIM(COALESCE(last_name, '')) <> '' THEN last_name
            WHEN instr(COALESCE(name, ''), ',') > 0 THEN TRIM(substr(name, 1, instr(name, ',') - 1))
            ELSE TRIM(COALESCE(name, ''))
          END,
          first_name = CASE
            WHEN TRIM(COALESCE(first_name, '')) <> '' THEN first_name
            WHEN instr(COALESCE(name, ''), ',') > 0 THEN TRIM(substr(name, instr(name, ',') + 1))
            ELSE ''
          END
        WHERE COALESCE(name, '') <> '';
      `);
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);
      CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
    `);
  }


  private ensureKnowledgeSchemaCompatibility(): void {
    if (!this.tableExists('case_legal_references')) return;

    const state = classifyCaseLegalReferencesColumns(this.columnsOf('case_legal_references'));
    if (state === 'current') return;

    if (state === 'legacy') {
      const legacyName = this.uniqueLegacyTableName('case_legal_references_legacy');
      this.db.exec(`ALTER TABLE case_legal_references RENAME TO ${legacyName};`);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_migration_notes (
          id TEXT PRIMARY KEY,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      this.db.prepare(`
        INSERT INTO knowledge_migration_notes (id, message, created_at)
        VALUES (?, ?, ?)
      `).run(
        `knowledge-legacy-${Date.now()}`,
        `Alte Tabelle case_legal_references wurde als ${legacyName} erhalten, weil sie das neue Feld legal_norm_id nicht enthielt. Neue Wissensdatenbank-Verknüpfungen werden in einer neuen Tabelle case_legal_references gespeichert.`,
        nowIso()
      );
    }
  }

  private columnsOf(table: string): string[] {
    if (!this.tableExists(table)) return [];
    const rows = this.db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all();
    return rows.map((row) => row.name);
  }

  private uniqueLegacyTableName(base: string): string {
    let candidate = `${base}_${Date.now()}`;
    let counter = 1;
    while (this.tableExists(candidate)) {
      candidate = `${base}_${Date.now()}_${counter}`;
      counter += 1;
    }
    return candidate;
  }

  private addColumnIfMissing(table: string, column: string, definition: string): void {
    if (!this.tableExists(table)) return;
    if (this.columnExists(table, column)) return;
    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }

  private repairKnownSchemaDrift(diagnostics: string[]): void {
    if (!this.tableExists('termination_hearings') || !TERMINATION_HEARINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('termination_hearings', column))) {
      this.rebuildTerminationHearingsTable();
      diagnostics.push('Kündigungsanhörungen-Schema wurde auf Stand 0017 repariert.');
    }

    if (!this.tableExists('personal_data_audit_log') || !PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS.every((column) => this.columnExists('personal_data_audit_log', column))) {
      this.ensurePersonalDataAuditLogSchema();
      diagnostics.push('Audit-Log-Schema wurde auf Stand 0018 repariert.');
    }

    if (!this.tableExists('sbv_participations') || !SBV_PARTICIPATION_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participations', column))) {
      this.ensureSbvParticipationSchema();
      diagnostics.push('SBV-Beteiligungsmonitor-Schema wurde auf Stand 0019 repariert.');
    }

    if (!this.tableExists('case_measures') || !CASE_MEASURES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measures', column)) || !this.tableExists('case_measure_participation') || !CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measure_participation', column))) {
      this.ensureCaseMeasureSchema();
      diagnostics.push('Fallmaßnahmen-Schema wurde auf Stand 0020 repariert.');
    }

    if (!this.tableExists('case_measure_notes') || !CASE_MEASURE_NOTES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measure_notes', column))) {
      this.ensureCaseMeasureNoteSchema();
      diagnostics.push('Maßnahmennotizen-Schema wurde auf Stand 0026 repariert.');
    }

    if (this.tableExists('case_documents')) {
      const missingDocumentExtractionColumns = CASE_DOCUMENTS_REQUIRED_COLUMNS
        .filter((column) => !this.columnExists('case_documents', column));
      if (missingDocumentExtractionColumns.length) {
        this.addColumnIfMissing('case_documents', 'extraction_quality', "TEXT NOT NULL DEFAULT 'unknown'");
        this.addColumnIfMissing('case_documents', 'text_extraction_status', "TEXT NOT NULL DEFAULT 'unknown'");
        this.addColumnIfMissing('case_documents', 'text_extracted_at', 'TEXT');
        this.addColumnIfMissing('case_documents', 'text_extractor_id', 'TEXT');
        this.addColumnIfMissing('case_documents', 'text_extraction_error', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_status', "TEXT NOT NULL DEFAULT 'not_required'");
        this.addColumnIfMissing('case_documents', 'ocr_text', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_engine', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_started_at', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_completed_at', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_error', 'TEXT');
        this.db.exec(`
          UPDATE case_documents
          SET extraction_quality = CASE WHEN COALESCE(extracted_text, '') <> '' THEN 'native_text' ELSE 'unknown' END,
              text_extraction_status = CASE WHEN COALESCE(extracted_text, '') <> '' THEN 'extracted' ELSE 'empty' END,
              text_extracted_at = COALESCE(imported_at, created_at, CURRENT_TIMESTAMP),
              text_extractor_id = COALESCE(text_extractor_id, CASE WHEN COALESCE(extracted_text, '') <> '' THEN 'legacy' ELSE 'unsupported' END)
          WHERE extraction_quality = 'unknown' AND text_extraction_status = 'unknown';
        `);
        this.ensureDocumentOcrSchema();
        diagnostics.push('Dokument-Extraktionsmetadaten wurden auf Stand 0031 repariert.');
      }
    }

    if (!this.tableExists('gremia_br_settings') || !GREMIA_BR_SETTINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_settings', column))) {
      this.ensureGremiaBrSettingsSchema();
      diagnostics.push('Gremia.BR-Einstellungsschema wurde auf Stand 0034 repariert.');
    }

    if (!this.tableExists('gremia_br_cache_entries') || !GREMIA_BR_CACHE_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_cache_entries', column))) {
      this.ensureGremiaBrCacheSchema();
      diagnostics.push('Gremia.BR-Lesecache-Schema wurde auf Stand 0033 repariert.');
    }

    if (this.tableExists('case_documents') && (!this.tableExists('case_document_ocr_jobs') || !CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_document_ocr_jobs', column)))) {
      this.ensureDocumentOcrSchema();
      diagnostics.push('Dokument-OCR-Schema wurde auf Stand 0031 repariert.');
    }

    if (!this.tableExists('case_search_index') || !this.tableExists('case_search_index_fts') || !this.tableExists('case_search_index_state') || !CASE_SEARCH_INDEX_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index', column)) || !CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index_state', column))) {
      this.ensureCaseSearchIndexSchema();
      diagnostics.push('Suchindex-Schema wurde auf Stand 0029 repariert.');
    }

    if (!this.hasCompleteProtectedPerson091Schema()) {
      this.ensureProtectedPerson091Schema();
      diagnostics.push('Personenverzeichnis-/Fallaktenbindung-Schema wurde auf Stand 0025 repariert.');
    }

    if (!this.hasCompleteCaseHandoverSchema()) {
      this.ensureCaseHandoverSchema();
      diagnostics.push('Fallübergabe-Schema wurde auf Stand 0036 repariert.');
    }


    if (!this.tableExists('sbv_control_protocols') || !SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_control_protocols', column))) {
      this.ensureSbvControlProtocolSchema();
      diagnostics.push('SBV-Steuerungsprotokoll-Schema wurde auf Stand 0040 repariert.');
    }

    if (!this.hasCompleteActivityJournalSchema()) {
      this.ensureActivityJournalSchema();
      diagnostics.push('Tätigkeitsjournal-Schema wurde auf Stand 0041 repariert.');
    }
  }

  private hasCompleteActivityJournalSchema(): boolean {
    return this.tableExists('activity_journal_entries')
      && this.tableExists('activity_journal_links')
      && this.tableExists('activity_journal_category_preferences')
      && ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_entries', column))
      && ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_links', column))
      && ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_category_preferences', column));
  }

  private ensureActivityJournalSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_journal_entries (
        id TEXT PRIMARY KEY,
        entry_date TEXT NOT NULL,
        started_at TEXT NULL,
        ended_at TEXT NULL,
        duration_minutes INTEGER NULL,
        time_mode TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NULL,
        result_note TEXT NULL,
        confidentiality_level TEXT NOT NULL,
        status TEXT NOT NULL,
        created_from TEXT NOT NULL,
        follow_up_due_at TEXT NULL,
        performed_outside_contract_work_time INTEGER NOT NULL DEFAULT 0,
        exported_for_activity_report_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(time_mode IN ('none','duration','range','timer')),
        CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
        CHECK(confidentiality_level IN ('normal','confidential','highly_confidential')),
        CHECK(status IN ('draft','final','follow_up_open')),
        CHECK(created_from IN ('manual','text_command','context_prefill','timer','import')),
        CHECK(duration_minutes IS NULL OR duration_minutes >= 0),
        CHECK(performed_outside_contract_work_time IN (0,1))
      );
      CREATE TABLE IF NOT EXISTS activity_journal_links (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL REFERENCES activity_journal_entries(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK(target_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','deadline','document')),
        target_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity_journal_category_preferences (
        context_type TEXT PRIMARY KEY CHECK(context_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','deadline','document','journal','fallfrei')),
        category TEXT NOT NULL CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_date ON activity_journal_entries(entry_date DESC, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_category ON activity_journal_entries(category, entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_status ON activity_journal_entries(status, entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_follow_up ON activity_journal_entries(follow_up_due_at);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_exported ON activity_journal_entries(exported_for_activity_report_at);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_links_entry ON activity_journal_links(entry_id);
      CREATE INDEX IF NOT EXISTS idx_activity_journal_links_target ON activity_journal_links(target_type, target_id);
    `);
  }

  private hasCompleteCaseHandoverSchema(): boolean {
    return this.tableExists('case_handover_imports')
      && this.tableExists('case_handover_import_items')
      && CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_imports', column))
      && CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_import_items', column))
      && ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'].every((column) => this.columnExists('cases', column))
      && CASE_MEASURES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measures', column));
  }

  private ensureCaseHandoverSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_handover_imports (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        valid_until TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        mode TEXT NOT NULL DEFAULT 'create_new',
        created_case_count INTEGER NOT NULL DEFAULT 0,
        updated_case_count INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_package ON case_handover_imports(package_id);
      CREATE TABLE IF NOT EXISTS case_handover_import_items (
        id TEXT PRIMARY KEY,
        handover_import_id TEXT NOT NULL REFERENCES case_handover_imports(id) ON DELETE CASCADE,
        local_entity_type TEXT NOT NULL,
        local_entity_id TEXT NOT NULL,
        package_ref TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_case_handover_items_local ON case_handover_import_items(local_entity_type, local_entity_id);
    `);
    this.addColumnIfMissing('cases', 'handover_import_id', 'TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL');
    this.addColumnIfMissing('cases', 'handover_package_id', 'TEXT');
    this.addColumnIfMissing('cases', 'handover_valid_until', 'TEXT');
    this.addColumnIfMissing('cases', 'handover_status', "TEXT NOT NULL DEFAULT 'none'");
    this.addColumnIfMissing('cases', 'handover_continue_confirmed_at', 'TEXT');
    this.addColumnIfMissing('cases', 'handover_continue_reason', 'TEXT');
    this.ensureCaseMeasureHandoverColumns();
  }


  private ensureDocumentOcrSchema(): void {
    if (this.tableExists('case_documents')) {
      this.addColumnIfMissing('case_documents', 'ocr_status', "TEXT NOT NULL DEFAULT 'not_required'");
      this.addColumnIfMissing('case_documents', 'ocr_text', 'TEXT');
      this.addColumnIfMissing('case_documents', 'ocr_engine', 'TEXT');
      this.addColumnIfMissing('case_documents', 'ocr_started_at', 'TEXT');
      this.addColumnIfMissing('case_documents', 'ocr_completed_at', 'TEXT');
      this.addColumnIfMissing('case_documents', 'ocr_error', 'TEXT');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_case_documents_ocr_status ON case_documents(ocr_status, imported_at);');
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_document_ocr_jobs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES case_documents(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','unsupported','failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_document ON case_document_ocr_jobs(document_id);
      CREATE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_status ON case_document_ocr_jobs(status, updated_at);
    `);
  }

  private ensureCaseSearchIndexSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_search_index (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        case_number TEXT,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_label TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT,
        occurred_at TEXT,
        updated_at TEXT NOT NULL,
        confidentiality TEXT NOT NULL DEFAULT 'sensibel',
        contains_health_data INTEGER NOT NULL DEFAULT 1,
        extraction_quality TEXT NOT NULL DEFAULT 'structured',
        navigation_kind TEXT NOT NULL,
        navigation_id TEXT NOT NULL,
        navigation_sub_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_type, source_id, case_id)
      );
      CREATE INDEX IF NOT EXISTS idx_case_search_index_case ON case_search_index(case_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_case_search_index_source ON case_search_index(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_case_search_index_navigation ON case_search_index(navigation_kind, navigation_id);
      CREATE TABLE IF NOT EXISTS case_search_index_state (
        case_id TEXT PRIMARY KEY,
        indexed_at TEXT NOT NULL,
        last_source_updated_at TEXT,
        source_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS case_search_index_fts USING fts5(
        index_id UNINDEXED,
        title,
        content,
        keywords,
        source_label,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);
  }

  private hasCompleteProtectedPerson091Schema(): boolean {
    return this.tableExists('protected_persons')
      && this.tableExists('person_import_runs')
      && this.tableExists('person_import_run_items')
      && this.tableExists('person_case_links')
      && this.tableExists('privacy_review_items')
      && PROTECTED_PERSONS_REQUIRED_COLUMNS.every((column) => this.columnExists('protected_persons', column))
      && PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('person_import_run_items', column))
      && CASES_REQUIRED_COLUMNS.every((column) => this.columnExists('cases', column))
      && this.columnExists('cases', 'privacy_review_priority')
      && this.columnExists('cases', 'anonymization_recommended')
      && this.columnExists('cases', 'anonymized_at');
  }

  private ensureProtectedPerson091Schema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS protected_persons (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        record_kind TEXT NOT NULL DEFAULT 'identified_person' CHECK (record_kind IN ('identified_person','pseudonymous_request')),
        pseudonym_label TEXT,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        personnel_number TEXT,
        work_email TEXT,
        organizational_unit TEXT,
        location TEXT,
        employment_state TEXT NOT NULL DEFAULT 'active_employee' CHECK (employment_state IN ('active_employee', 'left_company', 'unknown')),
        left_company_at TEXT,
        left_company_reason TEXT,
        protection_status TEXT NOT NULL DEFAULT 'unclear' CHECK (protection_status IN ('severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive')),
        status_valid_from TEXT,
        status_valid_until TEXT,
        evidence_checked_at TEXT,
        status_source TEXT NOT NULL DEFAULT 'unknown' CHECK (status_source IN ('employer_list', 'manual', 'self_disclosure', 'document_presented', 'unknown')),
        lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'expiring_soon', 'expired_review_required', 'retention_documented', 'anonymization_pending', 'anonymized', 'deleted_marker')),
        expiry_warning_created_at TEXT,
        expiry_review_due_at TEXT,
        retention_reason TEXT,
        retention_review_at TEXT,
        anonymized_at TEXT,
        anonymization_reason TEXT,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS person_import_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
        sheet_name TEXT,
        header_row_index INTEGER NOT NULL DEFAULT 0,
        first_data_row_index INTEGER NOT NULL DEFAULT 1,
        csv_delimiter TEXT,
        csv_encoding TEXT,
        column_mapping_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS person_import_runs (
        id TEXT PRIMARY KEY,
        profile_id TEXT REFERENCES person_import_profiles(id) ON DELETE SET NULL,
        source_file_name TEXT NOT NULL DEFAULT '',
        source_file_hash TEXT NOT NULL DEFAULT '',
        imported_at TEXT NOT NULL DEFAULT (datetime('now')),
        total_rows INTEGER NOT NULL DEFAULT 0,
        created_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        unchanged_count INTEGER NOT NULL DEFAULT 0,
        conflict_count INTEGER NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0,
        missing_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS person_import_run_items (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES person_import_runs(id) ON DELETE CASCADE,
        row_number INTEGER NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'unchanged', 'conflict', 'skipped', 'not_in_list')),
        protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
        match_strategy TEXT CHECK (match_strategy IN ('personnel_number', 'work_email', 'name_only_conflict', 'none')),
        conflict_reason TEXT,
        validation_message TEXT,
        changed_fields_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS person_case_links (
        id TEXT PRIMARY KEY,
        protected_person_id TEXT NOT NULL REFERENCES protected_persons(id) ON DELETE CASCADE,
        case_file_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        link_state TEXT NOT NULL DEFAULT 'active' CHECK (link_state IN ('active', 'person_anonymized', 'removed')),
        created_at TEXT NOT NULL,
        anonymized_at TEXT,
        link_reason TEXT,
        UNIQUE(protected_person_id, case_file_id)
      );
    `);

    this.addColumnIfMissing('protected_persons', 'record_kind', "TEXT NOT NULL DEFAULT 'identified_person'");
    this.addColumnIfMissing('protected_persons', 'pseudonym_label', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'employment_state', "TEXT NOT NULL DEFAULT 'active_employee'");
    this.addColumnIfMissing('protected_persons', 'left_company_at', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'left_company_reason', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'protection_status', "TEXT NOT NULL DEFAULT 'unclear'");
    this.addColumnIfMissing('protected_persons', 'status_source', "TEXT NOT NULL DEFAULT 'unknown'");
    this.addColumnIfMissing('protected_persons', 'lifecycle_state', "TEXT NOT NULL DEFAULT 'active'");
    this.addColumnIfMissing('protected_persons', 'status_valid_from', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'status_valid_until', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'evidence_checked_at', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'expiry_warning_created_at', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'expiry_review_due_at', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'retention_reason', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'retention_review_at', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'anonymized_at', 'TEXT');
    this.addColumnIfMissing('protected_persons', 'anonymization_reason', 'TEXT');

    this.addColumnIfMissing('cases', 'protected_person_id', 'TEXT REFERENCES protected_persons(id) ON DELETE SET NULL');
    this.addColumnIfMissing('cases', 'person_binding_state', "TEXT NOT NULL DEFAULT 'legacy_unlinked'");
    this.addColumnIfMissing('cases', 'privacy_review_required', 'INTEGER NOT NULL DEFAULT 0');
    this.addColumnIfMissing('cases', 'privacy_review_reason', 'TEXT');
    this.addColumnIfMissing('cases', 'privacy_review_due_at', 'TEXT');
    this.addColumnIfMissing('cases', 'privacy_review_priority', "TEXT NOT NULL DEFAULT 'normal'");
    this.addColumnIfMissing('cases', 'anonymization_recommended', 'INTEGER NOT NULL DEFAULT 0');
    this.addColumnIfMissing('cases', 'anonymized_at', 'TEXT');

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_protected_persons_name ON protected_persons(last_name, first_name);
      CREATE INDEX IF NOT EXISTS idx_protected_persons_personnel_number ON protected_persons(personnel_number);
      CREATE INDEX IF NOT EXISTS idx_protected_persons_work_email ON protected_persons(work_email);
      CREATE INDEX IF NOT EXISTS idx_protected_persons_status_until ON protected_persons(status_valid_until);
      CREATE INDEX IF NOT EXISTS idx_protected_persons_lifecycle ON protected_persons(lifecycle_state);
      CREATE INDEX IF NOT EXISTS idx_protected_persons_employment ON protected_persons(employment_state, left_company_at);
      CREATE INDEX IF NOT EXISTS idx_person_import_items_run ON person_import_run_items(run_id, row_number);
      CREATE INDEX IF NOT EXISTS idx_person_import_items_person ON person_import_run_items(protected_person_id);
      CREATE INDEX IF NOT EXISTS idx_person_case_links_person ON person_case_links(protected_person_id);
      CREATE INDEX IF NOT EXISTS idx_person_case_links_case ON person_case_links(case_file_id);
      CREATE INDEX IF NOT EXISTS idx_person_case_links_state ON person_case_links(link_state);
      CREATE INDEX IF NOT EXISTS idx_cases_protected_person ON cases(protected_person_id);
      CREATE INDEX IF NOT EXISTS idx_cases_person_binding_state ON cases(person_binding_state);
      CREATE INDEX IF NOT EXISTS idx_cases_privacy_review ON cases(privacy_review_required, privacy_review_due_at);
      CREATE TABLE IF NOT EXISTS privacy_review_items (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        priority TEXT NOT NULL,
        due_at TEXT NOT NULL,
        free_text_review_required INTEGER NOT NULL DEFAULT 1,
        context_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','cleared','anonymized','deleted','retention_documented')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_privacy_review_items_case ON privacy_review_items(case_id, status);
      CREATE INDEX IF NOT EXISTS idx_privacy_review_items_person ON privacy_review_items(protected_person_id, status);
    `);
  }


  private ensureCaseMeasureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_measures (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        risk_level TEXT NOT NULL DEFAULT 'normal',
        created_from TEXT NOT NULL DEFAULT 'manual',
        summary TEXT,
        next_step TEXT,
        due_at TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        requires_follow_up INTEGER NOT NULL DEFAULT 0,
        source_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        handover_import_id TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL,
        handover_package_id TEXT,
        handover_valid_until TEXT,
        handover_status TEXT NOT NULL DEFAULT 'none',
        handover_continue_confirmed_at TEXT,
        handover_continue_reason TEXT,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS case_measure_participation (
        measure_id TEXT PRIMARY KEY,
        employer_measure_type TEXT NOT NULL DEFAULT 'sonstiges',
        person_status TEXT NOT NULL DEFAULT 'unklar',
        decision_stage TEXT NOT NULL DEFAULT 'unklar',
        participation_status TEXT NOT NULL DEFAULT 'neu',
        sbv_knowledge_at TEXT,
        employer_information_at TEXT,
        hearing_requested_at TEXT,
        sbv_statement_due_at TEXT,
        sbv_statement_submitted_at TEXT,
        employer_decision_at TEXT,
        implementation_at TEXT,
        information_complete INTEGER NOT NULL DEFAULT 0,
        hearing_before_decision INTEGER NOT NULL DEFAULT 0,
        decision_notified INTEGER NOT NULL DEFAULT 0,
        suspension_requested_at TEXT,
        suspension_deadline_at TEXT,
        violation_summary TEXT,
        sbv_position TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS case_measure_events (
        id TEXT PRIMARY KEY,
        measure_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measures_case ON case_measures(case_id, type, status);
      CREATE INDEX IF NOT EXISTS idx_case_measures_type_status ON case_measures(type, status);
      CREATE INDEX IF NOT EXISTS idx_case_measures_due ON case_measures(due_at);
      CREATE INDEX IF NOT EXISTS idx_case_measures_source ON case_measures(source_id);
CREATE INDEX IF NOT EXISTS idx_case_measures_follow_up ON case_measures(case_id, requires_follow_up, status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_status ON case_measure_participation(participation_status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_statement_due ON case_measure_participation(sbv_statement_due_at);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_suspension_due ON case_measure_participation(suspension_deadline_at);
CREATE INDEX IF NOT EXISTS idx_case_measure_events_measure_created ON case_measure_events(measure_id, created_at);
    `);
    this.ensureCaseMeasureHandoverColumns();
    this.ensureCaseMeasureNoteSchema();
  }

  private ensureCaseMeasureHandoverColumns(): void {
    this.addColumnIfMissing('case_measures', 'handover_import_id', 'TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL');
    this.addColumnIfMissing('case_measures', 'handover_package_id', 'TEXT');
    this.addColumnIfMissing('case_measures', 'handover_valid_until', 'TEXT');
    this.addColumnIfMissing('case_measures', 'handover_status', "TEXT NOT NULL DEFAULT 'none'");
    this.addColumnIfMissing('case_measures', 'handover_continue_confirmed_at', 'TEXT');
    this.addColumnIfMissing('case_measures', 'handover_continue_reason', 'TEXT');
  }


  private ensureCaseMeasureNoteSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_measure_notes (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        measure_type TEXT NOT NULL CHECK (measure_type IN ('prevention','bem','termination_hearing','equalization','participation','workplace_accommodation')),
        measure_id TEXT NOT NULL,
        title TEXT NOT NULL,
        note_at TEXT NOT NULL,
        participants TEXT,
        content TEXT NOT NULL,
        next_steps TEXT,
        contains_health_data INTEGER NOT NULL DEFAULT 1,
        confidential_level TEXT NOT NULL DEFAULT 'sensibel' CHECK (confidential_level IN ('normal','sensibel','hoch_sensibel')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measure_notes_measure ON case_measure_notes(measure_type, measure_id, note_at DESC);
      CREATE INDEX IF NOT EXISTS idx_case_measure_notes_case ON case_measure_notes(case_id, note_at DESC);
    `);
  }


  private ensureWorkplaceAccommodationSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_measure_workplace_accommodation (
        measure_id TEXT PRIMARY KEY,
        category TEXT NOT NULL DEFAULT 'sonstiges',
        accommodation_status TEXT NOT NULL DEFAULT 'entwurf',
        requested_adjustment TEXT NOT NULL DEFAULT '',
        legal_basis TEXT NOT NULL DEFAULT '§ 164 Abs. 4 SGB IX',
        barrier_or_limitation TEXT,
        workplace_context TEXT,
        proposed_solution TEXT,
        technical_aid_needed INTEGER NOT NULL DEFAULT 0,
        organizational_adjustment_needed INTEGER NOT NULL DEFAULT 0,
        working_time_adjustment_needed INTEGER NOT NULL DEFAULT 0,
        qualification_needed INTEGER NOT NULL DEFAULT 0,
        fixed_workplace_needed INTEGER NOT NULL DEFAULT 0,
        homeoffice_or_mobile_work_relevant INTEGER NOT NULL DEFAULT 0,
        inclusion_office_involved INTEGER NOT NULL DEFAULT 0,
        rehab_carrier_involved INTEGER NOT NULL DEFAULT 0,
        employer_response_status TEXT NOT NULL DEFAULT 'offen',
        employer_response_at TEXT,
        implementation_status TEXT NOT NULL DEFAULT 'nicht_begonnen',
        implementation_due_at TEXT,
        effectiveness_review_at TEXT,
        outcome TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_status ON case_measure_workplace_accommodation(accommodation_status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_category ON case_measure_workplace_accommodation(category);
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_review ON case_measure_workplace_accommodation(effectiveness_review_at);
    `);
  }

  private rebuildTerminationHearingsTable(): void {
    this.db.exec(`
      DROP INDEX IF EXISTS idx_termination_hearings_case_id;
      DROP INDEX IF EXISTS idx_termination_hearings_status;
      DROP INDEX IF EXISTS idx_termination_hearings_due;
      DROP INDEX IF EXISTS idx_termination_hearings_received_at;
      DROP TABLE IF EXISTS termination_hearings;

      CREATE TABLE termination_hearings (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'eingang',
        termination_type TEXT NOT NULL DEFAULT 'sonstiges',
        protection_status TEXT NOT NULL DEFAULT 'unklar',
        received_at TEXT,
        employer_deadline_at TEXT,
        sbv_statement_due_at TEXT,
        works_council_hearing_at TEXT,
        integration_office_requested_at TEXT,
        integration_office_decision_at TEXT,
        integration_office_decision TEXT,
        employer_reason TEXT,
        missing_information TEXT,
        sbv_assessment TEXT,
        statement TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_termination_hearings_case_id ON termination_hearings(case_id);
      CREATE INDEX IF NOT EXISTS idx_termination_hearings_status ON termination_hearings(status);
      CREATE INDEX IF NOT EXISTS idx_termination_hearings_due ON termination_hearings(sbv_statement_due_at);
    `);
  }

  private ensurePersonalDataAuditLogSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personal_data_audit_log (
        id TEXT PRIMARY KEY,
        sequence INTEGER NOT NULL UNIQUE,
        occurred_at TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        subject_type TEXT NOT NULL,
        subject_id TEXT,
        case_id TEXT,
        purpose TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        entry_hash TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_personal_data_audit_sequence ON personal_data_audit_log(sequence);
      CREATE INDEX IF NOT EXISTS idx_personal_data_audit_case ON personal_data_audit_log(case_id, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_personal_data_audit_subject ON personal_data_audit_log(subject_type, subject_id, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_personal_data_audit_action ON personal_data_audit_log(action, occurred_at);
    `);
  }


  private ensureSbvParticipationSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participations (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        title TEXT NOT NULL,
        measure_type TEXT NOT NULL DEFAULT 'sonstiges',
        status TEXT NOT NULL DEFAULT 'neu',
        risk_level TEXT NOT NULL DEFAULT 'normal',
        person_status TEXT NOT NULL DEFAULT 'unklar',
        decision_stage TEXT NOT NULL DEFAULT 'unklar',
        first_known_at TEXT,
        information_received_at TEXT,
        hearing_requested_at TEXT,
        statement_due_at TEXT,
        statement_submitted_at TEXT,
        employer_decision_at TEXT,
        implementation_at TEXT,
        information_complete INTEGER NOT NULL DEFAULT 0,
        hearing_before_decision INTEGER NOT NULL DEFAULT 0,
        decision_notified INTEGER NOT NULL DEFAULT 0,
        suspension_requested_at TEXT,
        suspension_due_at TEXT,
        violation_summary TEXT,
        sbv_position TEXT,
        next_step TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sbv_participation_events (
        id TEXT PRIMARY KEY,
        participation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(participation_id) REFERENCES sbv_participations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sbv_participations_case_id ON sbv_participations(case_id);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_status ON sbv_participations(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_risk ON sbv_participations(risk_level);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_statement_due ON sbv_participations(statement_due_at);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_suspension_due ON sbv_participations(suspension_due_at);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_events_process ON sbv_participation_events(participation_id, created_at);
    `);
  }

  private hasMigration(version: string): boolean {
    return Boolean(this.db.prepare<MigrationRow>('SELECT version FROM schema_migrations WHERE version = ?').get(version));
  }

  private recordMigration(definition: MigrationDefinition, mode: string, notes: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO schema_migrations (version, filename, checksum, applied_at, app_version, mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(definition.version, definition.filename, definition.checksum, nowIso(), APP_VERSION, mode, notes);
    this.logMigration(definition, mode, notes);
  }

  private logMigration(definition: MigrationDefinition, action: string, message: string): void {
    this.db.prepare(`
      INSERT INTO schema_migration_log (id, version, filename, action, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`${definition.version}-${Date.now()}-${Math.random().toString(16).slice(2)}`, definition.version, definition.filename, action, message, nowIso());
  }

  private writeSchemaSettings(version: string): void {
    if (!this.tableExists('settings')) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);`);
    }
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(DATABASE_SCHEMA_VERSION_KEY, version, nowIso());
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(DATABASE_SCHEMA_APP_VERSION_KEY, APP_VERSION, nowIso());
  }


  private ensureGremiaBrSettingsSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gremia_br_settings (
        id TEXT PRIMARY KEY CHECK (id = 'default'),
        enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
        server_url TEXT NOT NULL DEFAULT '',
        username TEXT NOT NULL DEFAULT '',
        password_secret TEXT NOT NULL DEFAULT '',
        last_connection_test_at TEXT,
        last_successful_login_at TEXT,
        profile_json TEXT,
        relevance_keywords_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.addColumnIfMissing('gremia_br_settings', 'relevance_keywords_json', 'TEXT');
  }

  private ensureGremiaBrCacheSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gremia_br_cache_entries (
        id TEXT PRIMARY KEY,
        cache_key TEXT NOT NULL UNIQUE,
        source_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_gremia_br_cache_entries_key ON gremia_br_cache_entries(cache_key);
      CREATE INDEX IF NOT EXISTS idx_gremia_br_cache_entries_fetched ON gremia_br_cache_entries(fetched_at DESC);
    `);
  }

  private validateRequiredSchema(diagnostics: string[]): void {
    const requiredTables = [
      'cases',
      'case_notes',
      'case_documents',
      'contacts',
      'deadlines',
      'document_templates',
      'prevention_processes',
      'bem_processes',
      'bem_process_contacts',
      'bem_process_events',
      'termination_hearings',
      'personal_data_audit_log',
      'sbv_participations',
      'case_measures',
      'case_measure_participation',
      'case_measure_workplace_accommodation',
      'protected_persons',
      'person_import_runs',
      'person_import_run_items',
      'person_case_links',
      'case_external_references',
      'case_handover_imports',
      'case_handover_import_items',
      'sbv_resource_records',
      'sbv_control_protocols',
      'activity_journal_entries',
      'activity_journal_links',
      'activity_journal_category_preferences',
      'generated_documents',
      'sbv_participation_violations',
      'sbv_participation_violation_events',
      'sbv_participation_violation_documents'
    ];

    requiredTables.forEach((table) => {
      if (!this.tableExists(table)) {
        throw new Error(`Datenbankschema unvollständig: Tabelle ${table} fehlt.`);
      }
    });

    const requiredColumns: Record<string, string[]> = {
      cases: [...CASES_REQUIRED_COLUMNS],
      case_documents: [...CASE_DOCUMENTS_REQUIRED_COLUMNS],
      contacts: ['id', 'first_name', 'last_name', 'category'],
      deadlines: ['id', 'title', 'due_at', 'status'],
      prevention_processes: ['id', 'case_id', 'status'],
      bem_processes: ['id', 'case_id', 'status', 'title', 'trigger_type', 'employee_response', 'privacy_notice_at', 'consent_scope', 'measure_owners', 'completion_reason', 'created_at', 'updated_at'],
      termination_hearings: [...TERMINATION_HEARINGS_REQUIRED_COLUMNS],
      personal_data_audit_log: [...PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS],
      sbv_participations: [...SBV_PARTICIPATION_REQUIRED_COLUMNS],
      case_measures: [...CASE_MEASURES_REQUIRED_COLUMNS],
      case_measure_participation: [...CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS],
      case_measure_workplace_accommodation: [...CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS],
      protected_persons: [...PROTECTED_PERSONS_REQUIRED_COLUMNS],
      person_import_run_items: [...PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS],
      case_external_references: [...CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS],
      case_handover_imports: [...CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS],
      case_handover_import_items: [...CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS],
      sbv_resource_records: [...SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS],
      sbv_control_protocols: [...SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS],
      activity_journal_entries: [...ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS],
      activity_journal_links: [...ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS],
      activity_journal_category_preferences: [...ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS],
      generated_documents: [...GENERATED_DOCUMENTS_REQUIRED_COLUMNS],
      sbv_participation_violations: [...SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS],
      sbv_participation_violation_events: [...SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS],
      sbv_participation_violation_documents: [...SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS]
    };

    Object.entries(requiredColumns).forEach(([table, columns]) => {
      columns.forEach((column) => {
        if (!this.columnExists(table, column)) {
          throw new Error(`Datenbankschema unvollständig: Spalte ${table}.${column} fehlt.`);
        }
      });
    });

    if (this.tableExists('bem_processes_legacy_0500')) {
      diagnostics.push('Frühe/defekte BEM-Tabelle wurde als bem_processes_legacy_0500 gesichert.');
    }
  }


  private ensureSbvControlProtocolSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_control_protocols (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        partner TEXT NOT NULL,
        topic TEXT NOT NULL,
        meeting_at TEXT NOT NULL,
        participants TEXT,
        legal_context TEXT,
        discussion TEXT,
        result TEXT,
        next_steps TEXT,
        follow_up_due_at TEXT,
        status TEXT NOT NULL DEFAULT 'documented',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_partner ON sbv_control_protocols(partner);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_topic ON sbv_control_protocols(topic);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_status ON sbv_control_protocols(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_meeting ON sbv_control_protocols(meeting_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_follow_up ON sbv_control_protocols(follow_up_due_at);
    `);
  }

  private currentSchemaVersion(): string {
    const row = this.db.prepare<{ version: string }>('SELECT MAX(version) AS version FROM schema_migrations').get();
    return row?.version ?? '0000';
  }

  private tableExists(table: string): boolean {
    return rowToBoolean(this.db.prepare<{ found: number }>(`SELECT 1 AS found FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`).get(table));
  }

  private indexExists(indexName: string): boolean {
    return rowToBoolean(this.db.prepare<{ found: number }>(`SELECT 1 AS found FROM sqlite_master WHERE type = 'index' AND name = ?`).get(indexName));
  }

  private columnExists(table: string, column: string): boolean {
    if (!this.tableExists(table)) return false;
    const rows = this.db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all();
    return rows.some((row) => row.name === column);
  }
}
