import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { classifyCaseLegalReferencesColumns } from './knowledgeMigrationPolicy.js';
import { APP_VERSION } from './generated/appMetadata.js';
import { APP_SCHEMA_VERSION, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from './appSchema.js';

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
      'sbv_participations'
    ];

    requiredTables.forEach((table) => {
      if (!this.tableExists(table)) {
        throw new Error(`Datenbankschema unvollständig: Tabelle ${table} fehlt.`);
      }
    });

    const requiredColumns: Record<string, string[]> = {
      cases: ['id', 'case_number', 'display_name', 'category', 'status'],
      contacts: ['id', 'first_name', 'last_name', 'category'],
      deadlines: ['id', 'title', 'due_at', 'status'],
      prevention_processes: ['id', 'case_id', 'status'],
      bem_processes: ['id', 'case_id', 'status', 'title', 'trigger_type', 'employee_response', 'privacy_notice_at', 'consent_scope', 'measure_owners', 'completion_reason', 'created_at', 'updated_at'],
      termination_hearings: [...TERMINATION_HEARINGS_REQUIRED_COLUMNS],
      personal_data_audit_log: [...PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS],
      sbv_participations: [...SBV_PARTICIPATION_REQUIRED_COLUMNS]
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
