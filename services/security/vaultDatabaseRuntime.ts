import {
  existsSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { MigrationService } from "../migrationService.js";
import { DatabaseRuntimeInitializer } from "../databaseRuntimeInitializer.js";
import { SecurityServiceCore } from './securityServiceCore.js';
import { BACKUPS_DIR_NAME } from './securitySupport.js';
import { createVerifiedPreMigrationVaultBackup } from '../preMigrationVaultBackup.js';
import { normalizeStoredDocumentPaths } from '../documentStorageReferenceMigration.js';
import { PersonalDataAuditLogService, registerAuditIntegrityKey } from '../auditLogService.js';
import { readAuditIntegrityAnchor, writeAuditIntegrityAnchor, type AuditIntegrityAnchor } from '../auditIntegrityAnchor.js';

export class VaultDatabaseRuntime extends SecurityServiceCore {
  protected async openAndInitializeVaultDatabase(
      databaseKey: Buffer,
    ): Promise<void> {
      this.ensureDataLayout();
      const schemaPath = this.resolveSchemaPath();
      const migrationsDir = this.resolveMigrationsDir();
      const migrationVersions = readdirSync(migrationsDir)
        .map((name) => /^(\d{4})_.*\.sql$/.exec(name)?.[1])
        .filter((version): version is string => Boolean(version));
  
      const keyHex = databaseKey.toString("hex");
      const db = await this.databaseService.open(this.vaultDatabasePath, keyHex);
      const hadAuditMacColumn = db.prepare<{ name: string }>('PRAGMA table_info(personal_data_audit_log)')
        .all().some((column) => column.name === 'entry_mac');
      // keyHex ist ein JS-String und kann nicht zuverlässig überschrieben werden.
      const preMigrationBackup = await createVerifiedPreMigrationVaultBackup({
        db,
        vaultPath: this.vaultDatabasePath,
        anchorPath: this.auditAnchorPath,
        backupDirectory: path.join(this.dataDir, BACKUPS_DIR_NAME),
        migrationVersions,
      });
      const result = new MigrationService(
        db,
        schemaPath,
        migrationsDir,
      ).migrate();
      const migrationEnabledAuditKey = [...result.applied, ...result.inferred]
        .some((fileName) => fileName.startsWith('0066_'));
      const vaultId = this.readManifest().vaultId;
      let anchor: AuditIntegrityAnchor;
      if (existsSync(this.auditAnchorPath)) {
        anchor = readAuditIntegrityAnchor(this.auditAnchorPath, databaseKey, vaultId);
      } else {
        if (hadAuditMacColumn || !migrationEnabledAuditKey) {
          throw new Error('Der geschützte Audit-Vertrauensanker fehlt. Tresorintegrität kann nicht bestätigt werden.');
        }
        const previous = db.prepare<{ sequence: number; entry_hash: string }>(
          'SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1'
        ).get();
        anchor = {
          vaultId,
          sequence: Number(previous?.sequence ?? 0),
          entryHash: previous?.entry_hash ?? '0'.repeat(64),
          legacyMaxSequence: Number(previous?.sequence ?? 0)
        };
      }
      registerAuditIntegrityKey(db, databaseKey, anchor.legacyMaxSequence,
        existsSync(this.auditAnchorPath) ? anchor : undefined);
      const auditStatus = new PersonalDataAuditLogService(db).verifyChain();
      if (!auditStatus.ok) {
        throw new Error('Die Audit-Kette stimmt nicht mit dem geschützten Vertrauensanker überein. Tresor wurde nicht entsperrt.');
      }
      if (!existsSync(this.auditAnchorPath)) writeAuditIntegrityAnchor(this.auditAnchorPath, databaseKey, anchor);
      this.auditAnchor = anchor;
      const normalizedDocumentPaths = normalizeStoredDocumentPaths(db, this.dataDir);
      const runtimeInitialization = new DatabaseRuntimeInitializer(db).initialize();
  
      if (result.applied.length || result.inferred.length || runtimeInitialization.baselineEntriesCreated > 0 || normalizedDocumentPaths > 0) {
        console.log("Gremia.SBV database migrations:", {
          applied: result.applied,
          inferred: result.inferred,
          schemaVersion: result.currentSchemaVersion,
          diagnostics: result.diagnostics,
          lifecycleBaselineEntries: runtimeInitialization.baselineEntriesCreated,
          normalizedDocumentPaths,
          preMigrationBackup: preMigrationBackup
            ? { file: path.basename(preMigrationBackup.filePath), sizeBytes: preMigrationBackup.sizeBytes }
            : undefined,
        });
      }
    }

  protected resolveSchemaPath(): string {
      const candidates = this.runtimeEnvironment.isPackaged
        ? this.runtimeEnvironment.resourcesPath
          ? [path.join(this.runtimeEnvironment.resourcesPath, "database", "schema.sql")]
          : []
        : [
            path.join(this.runtimeEnvironment.workingDirectory, "database", "schema.sql"),
            path.join(__dirname, "../database/schema.sql"),
            path.join(__dirname, "../../database/schema.sql"),
          ];
  
      const match = candidates.find((candidate) => existsSync(candidate));
      if (!match) {
        throw new Error(
          `Datenbankschema nicht gefunden. Geprüft: ${candidates.join(", ")}`,
        );
      }
  
      return match;
    }

  protected resolveMigrationsDir(): string {
      const candidates = this.runtimeEnvironment.isPackaged
        ? this.runtimeEnvironment.resourcesPath
          ? [path.join(this.runtimeEnvironment.resourcesPath, "database", "migrations")]
          : []
        : [
            path.join(this.runtimeEnvironment.workingDirectory, "database", "migrations"),
            path.join(__dirname, "../database/migrations"),
            path.join(__dirname, "../../database/migrations"),
          ];
  
      const match = candidates.find((candidate) => existsSync(candidate));
      if (!match) {
        throw new Error(
          `Datenbankmigrationen nicht gefunden. Geprüft: ${candidates.join(", ")}`,
        );
      }
  
      return match;
    }
}
