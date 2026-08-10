import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from '../appSchema.js';
import { MigrationInference } from './migrationInference.js';
import { isAlterAddColumnStatement, normalizeSql, nowIso, parseAddColumnStatement, splitSqlStatements } from './migrationSupport.js';
import type { MigrationDefinition } from './migrationSupport.js';

export class MigrationExecutor extends MigrationInference {
  protected applyFreshSchemaHooks(definitions: MigrationDefinition[]): void {
      definitions.forEach((definition) => {
        const schemaHook = getSchemaMigrationHook(definition.version);
        if (!schemaHook) return;
        const sql = normalizeSql(fs.readFileSync(definition.path, 'utf8'));
        this.db.exec('BEGIN');
        try {
          this.applyAddColumnsSafely(sql);
          this.executeStatements(sql, { skipAlterAddColumn: true });
          schemaHook.apply(this.db);
          this.db.exec('COMMIT');
        } catch (error) {
          this.db.exec('ROLLBACK');
          throw new Error(`Schema-Hook ${definition.version} fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }

  protected applyMigration(definition: MigrationDefinition): void {
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
        const schemaHook = getSchemaMigrationHook(definition.version);
        if (schemaHook) schemaHook.apply(this.db);
        this.recordMigration(definition, schemaHook ? 'sql+schema-hook' : 'sql', schemaHook
          ? `Migration erfolgreich angewendet; ${schemaHook.components.length} konsolidierte Schemakomponenten ausgeführt.`
          : 'Migration erfolgreich angewendet.');
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        this.logMigration(definition, 'failed', error instanceof Error ? error.message : String(error));
        throw new Error(`Migration ${definition.filename} fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

  protected executeStatements(sql: string, options: { skipAlterAddColumn?: boolean; skipUnsafeCreateContacts?: boolean } = {}): void {
      const statements = splitSqlStatements(sql);
      statements.forEach((statement) => {
        const trimmed = statement.trim();
        if (!trimmed || trimmed.startsWith('--')) return;
        if (options.skipAlterAddColumn && isAlterAddColumnStatement(trimmed)) return;
        if (options.skipUnsafeCreateContacts && /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+contacts\s*\(/i.test(trimmed)) return;
        this.db.exec(`${trimmed};`);
      });
    }

  protected applyAddColumnsSafely(sql: string): void {
      splitSqlStatements(sql).forEach((statement) => {
        if (!isAlterAddColumnStatement(statement)) return;
        const parsed = parseAddColumnStatement(statement);
        if (!parsed) return;
        if (!this.tableExists(parsed.table)) return;
        if (this.columnExists(parsed.table, parsed.column)) return;
        this.db.exec(`${statement.trim()};`);
      });
    }

  protected ensureContactsSchema(): void {
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

  protected ensureKnowledgeSchemaCompatibility(): void {
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
}
