import { MigrationRepairValidation } from './migrations/migrationRepairValidation.js';
import { APP_SCHEMA_VERSION } from './appSchema.js';
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
