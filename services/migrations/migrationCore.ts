import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from '../appSchema.js';
import { MIGRATION_TABLE_SQL, checksum, getVersionFromFilename, nowIso, rowToBoolean } from './migrationSupport.js';
import type { MigrationDefinition, MigrationRow } from './migrationSupport.js';

export class MigrationCore {
  protected readonly db: DatabaseAdapter;

  constructor(
      database: DatabaseAdapter,
      private readonly schemaPath: string,
      private readonly migrationsDir: string
    ) {
      this.db = database;
    }

  protected ensureMigrationTables(): void {
      this.db.exec(MIGRATION_TABLE_SQL);
    }

  protected isFreshDatabase(): boolean {
      const rows = this.db.prepare<{ name: string }>(`
        SELECT name FROM sqlite_master
        WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
          AND name NOT IN ('schema_migrations', 'schema_migration_log')
      `).all();
      return rows.length === 0;
    }

  protected applyBaseSchema(): void {
      if (!fs.existsSync(this.schemaPath)) {
        throw new Error(`Basisschema nicht gefunden: ${this.schemaPath}`);
      }
      const schemaSql = fs.readFileSync(this.schemaPath, 'utf8');
      this.db.exec(schemaSql);
      this.ensureMigrationTables();
    }

  protected listMigrationDefinitions(): MigrationDefinition[] {
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

  protected hasMigration(version: string): boolean {
      return Boolean(this.db.prepare<MigrationRow>('SELECT version FROM schema_migrations WHERE version = ?').get(version));
    }

  protected recordMigration(definition: MigrationDefinition, mode: string, notes: string): void {
      this.db.prepare(`
        INSERT OR REPLACE INTO schema_migrations (version, filename, checksum, applied_at, app_version, mode, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(definition.version, definition.filename, definition.checksum, nowIso(), APP_VERSION, mode, notes);
      this.logMigration(definition, mode, notes);
    }

  protected logMigration(definition: MigrationDefinition, action: string, message: string): void {
      this.db.prepare(`
        INSERT INTO schema_migration_log (id, version, filename, action, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`${definition.version}-${Date.now()}-${Math.random().toString(16).slice(2)}`, definition.version, definition.filename, action, message, nowIso());
    }

  protected writeSchemaSettings(version: string): void {
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

  protected currentSchemaVersion(): string {
      const row = this.db.prepare<{ version: string }>('SELECT MAX(version) AS version FROM schema_migrations').get();
      return row?.version ?? '0000';
    }

  protected tableExists(table: string): boolean {
      return rowToBoolean(this.db.prepare<{ found: number }>(`SELECT 1 AS found FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`).get(table));
    }

  protected indexExists(indexName: string): boolean {
      return rowToBoolean(this.db.prepare<{ found: number }>(`SELECT 1 AS found FROM sqlite_master WHERE type = 'index' AND name = ?`).get(indexName));
    }

  protected columnExists(table: string, column: string): boolean {
      if (!this.tableExists(table)) return false;
      const rows = this.db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all();
      return rows.some((row) => row.name === column);
    }

  protected columnsOf(table: string): string[] {
      if (!this.tableExists(table)) return [];
      const rows = this.db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all();
      return rows.map((row) => row.name);
    }

  protected uniqueLegacyTableName(base: string): string {
      let candidate = `${base}_${Date.now()}`;
      let counter = 1;
      while (this.tableExists(candidate)) {
        candidate = `${base}_${Date.now()}_${counter}`;
        counter += 1;
      }
      return candidate;
    }

  protected addColumnIfMissing(table: string, column: string, definition: string): void {
      if (!this.tableExists(table)) return;
      if (this.columnExists(table, column)) return;
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    }
}
