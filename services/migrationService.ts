import { MigrationRepairValidation } from './migrations/migrationRepairValidation.js';
import { APP_SCHEMA_VERSION } from './appSchema.js';
import { DATABASE_SCHEMA_COOKIE_KEY, DATABASE_SCHEMA_VERSION_KEY } from './appSchema.js';
import type { MigrationResult } from './migrations/migrationSupport.js';
export { normalizeSql, splitSqlStatements, getVersionFromFilename, isAlterAddColumnStatement, parseAddColumnStatement } from './migrations/migrationSupport.js';
export type { MigrationResult } from './migrations/migrationSupport.js';

export class MigrationService extends MigrationRepairValidation {
  migrate(): MigrationResult {
      const applied: string[] = [];
      const skipped: string[] = [];
      const inferred: string[] = [];
      const diagnostics: string[] = [];
  
      this.ensureMigrationTables();

      const currentVersion = this.currentSchemaVersion();
      if (currentVersion === APP_SCHEMA_VERSION && this.tableExists('settings')) {
        const savedVersion = this.db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?')
          .get(DATABASE_SCHEMA_VERSION_KEY)?.value;
        const savedSchemaCookie = Number(this.db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?')
          .get(DATABASE_SCHEMA_COOKIE_KEY)?.value);
        const actualSchemaCookie = this.db.prepare<{ schema_version: number }>('PRAGMA schema_version').get()?.schema_version;
        if (savedVersion === APP_SCHEMA_VERSION && Number.isSafeInteger(savedSchemaCookie)
          && savedSchemaCookie === actualSchemaCookie) {
          const definitions = this.listMigrationDefinitions();
          const recorded = this.db.prepare<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version').all();
          if (recorded.length === definitions.length
            && recorded.every((row, index) => row.version === definitions[index].version)) {
            return {
              applied, skipped: definitions.map((definition) => definition.filename), inferred,
              currentSchemaVersion: currentVersion, diagnostics,
            };
          }
        }
      }
  
      if (this.isFreshDatabase()) {
        this.applyBaseSchema();
        const definitions = this.listMigrationDefinitions();
        this.applyFreshSchemaHooks(definitions);
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
}
