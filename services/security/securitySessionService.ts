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
import { ApplicationError } from "../../src/domain/models/application-error.model.js";
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
import { VaultCredentialService } from './vaultCredentialService.js';
import { RESET_CONFIRMATION } from './securitySupport.js';

export class SecuritySessionService extends VaultCredentialService {
  destroyLocalVault(confirmation: string): SecurityResult {
      if (confirmation !== RESET_CONFIRMATION) {
        return {
          ok: false,
          initialized: this.status().initialized,
          unlocked: false,
          error: `Bitte exakt „${RESET_CONFIRMATION}“ eingeben.`,
        };
      }
  
      this.unlocked = false;
      this.destroyActiveDatabaseKey();
      this.databaseService.close();
      rmSync(this.dataDir, { recursive: true, force: true });
      this.ensureDataLayout();
      return { ok: true, initialized: false, unlocked: false };
    }

  lock(reason = "manual"): void {
      if (this.unlocked) {
        this.auditSecurityEvent(
          "lock",
          reason === "auto" ? "Tresor automatisch gesperrt" : "Tresor gesperrt",
          { reason },
        );
      }
      this.unlocked = false;
      this.destroyActiveDatabaseKey();
      try {
        this.databaseService.close();
      } catch {
        // Der Zugriff ist bereits gesperrt und der aktive Schlüssel vernichtet.
      }
      try {
        this.tempFiles.cleanup();
      } catch {
        // Klartextbereinigung ist wichtig, darf die technische Sperre aber nicht zurücknehmen.
      }
    }

  cleanupTemporaryFiles(): TempFileCleanupResult {
      const result = this.tempFiles.cleanup();
      if (this.unlocked) {
        this.auditSecurityEvent(
          "cleanup",
          "Temporäre Klartext-Arbeitskopien bereinigt",
          {
            deleted: result.deleted,
            failed: result.failed,
            remaining: result.remaining,
          },
        );
      }
      return result;
    }

  temporaryFileStatus(): TempFileStatus {
      return this.tempFiles.status();
    }

  writeTemporaryFile(
      scope: "document-preview" | "report-preview" | "misc",
      originalFileName: string,
      content: Buffer,
      prefix?: string,
    ): string {
      return this.tempFiles.write(scope, originalFileName, content, prefix);
    }



  isUnlocked(): boolean {
      return this.unlocked;
    }

  getActiveDatabase(): DatabaseAdapter {
      if (!this.unlocked) {
        throw new ApplicationError(
          "SECURITY_OPERATION_FAILED",
          "Gremia.SBV ist gesperrt. Datenbankzugriff verweigert.",
          "security:database-access",
        );
      }
      return this.databaseService.active;
    }

  getActiveDatabaseKey(): Buffer {
      if (!this.unlocked || !this.databaseKey) {
        throw new ApplicationError(
          "SECURITY_OPERATION_FAILED",
          "Gremia.SBV ist gesperrt. Schlüsselzugriff verweigert.",
          "security:database-key-access",
        );
      }
      return Buffer.from(this.databaseKey);
    }

  getDataDirectory(): string {
      return this.dataDir;
    }
}
