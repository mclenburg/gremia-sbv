import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type {
  SecurityResult,
  SecurityStatus,
} from "../../src/domain/models/security.model.js";
import { DatabaseService, type DatabaseAdapter } from "../databaseService.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";
import {
  TempFileService,
  type TempFileCleanupResult,
  type TempFileStatus,
} from "../tempFileService.js";
import { MigrationService } from "../migrationService.js";
import { DatabaseRuntimeInitializer } from "../databaseRuntimeInitializer.js";
import { atomicWriteFileSync, commitAtomicArtifacts } from "../secureFileOperations.js";
import { validateAppPassword, validatePasswordStore, validateVaultManifest, type KeyWrap, type PasswordStore, type ScryptKdfParams, type VaultManifest } from "../securityArtifactValidation.js";
import { SecurityServiceCore } from './securityServiceCore.js';

export class VaultDatabaseRuntime extends SecurityServiceCore {
  protected async openAndInitializeVaultDatabase(
      databaseKey: Buffer,
    ): Promise<void> {
      this.ensureDataLayout();
      const schemaPath = this.resolveSchemaPath();
      const migrationsDir = this.resolveMigrationsDir();
  
      const keyHex = databaseKey.toString("hex");
      const db = await this.databaseService.open(this.vaultDatabasePath, keyHex);
      // keyHex ist ein JS-String und kann nicht zuverlässig überschrieben werden.
      const result = new MigrationService(
        db,
        schemaPath,
        migrationsDir,
      ).migrate();
      const runtimeInitialization = new DatabaseRuntimeInitializer(db).initialize();
  
      if (result.applied.length || result.inferred.length || runtimeInitialization.baselineEntriesCreated > 0) {
        console.log("Gremia.SBV database migrations:", {
          applied: result.applied,
          inferred: result.inferred,
          schemaVersion: result.currentSchemaVersion,
          diagnostics: result.diagnostics,
          lifecycleBaselineEntries: runtimeInitialization.baselineEntriesCreated,
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
