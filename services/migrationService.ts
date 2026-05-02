import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';

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
}

interface MigrationDefinition {
  version: string;
  filename: string;
  path: string;
  checksum: string;
}

const APP_SCHEMA_VERSION = '0010';
const APP_VERSION = '0.3.33';
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

function normalizeSql(sql: string): string {
  return sql
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

function splitSqlStatements(sql: string): string[] {
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

function getVersionFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4})[_-].+\.sql$/i);
  return match?.[1] ?? null;
}

function isAlterAddColumnStatement(statement: string): boolean {
  return /^ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN\s+/i.test(statement.trim());
}

function parseAddColumnStatement(statement: string): { table: string; column: string } | null {
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

    this.ensureMigrationTables();

    if (this.isFreshDatabase()) {
      this.applyBaseSchema();
      const definitions = this.listMigrationDefinitions();
      definitions.forEach((definition) => {
        this.recordMigration(definition, 'baseline', 'Frische Datenbank wurde über database/schema.sql auf aktuellen Stand initialisiert.');
        inferred.push(definition.filename);
      });
      this.writeSchemaSettings(APP_SCHEMA_VERSION);
      return { applied, skipped, inferred, currentSchemaVersion: APP_SCHEMA_VERSION };
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

    this.writeSchemaSettings(APP_SCHEMA_VERSION);
    return { applied, skipped, inferred, currentSchemaVersion: this.currentSchemaVersion() };
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

  private addColumnIfMissing(table: string, column: string, definition: string): void {
    if (!this.tableExists(table)) return;
    if (this.columnExists(table, column)) return;
    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
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
    `).run('database.schema.version', version, nowIso());
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run('database.schema.appVersion', APP_VERSION, nowIso());
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
