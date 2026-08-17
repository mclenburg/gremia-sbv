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
import { VaultDatabaseRuntime } from './vaultDatabaseRuntime.js';
import { MAX_UNLOCK_DELAY_MS, UNLOCK_DELAY_STEPS } from './securitySupport.js';
import type { UnlockDelaySnapshot } from './securitySupport.js';

export class UnlockDelayService extends VaultDatabaseRuntime {
  protected currentUnlockDelay(): UnlockDelaySnapshot {
      const now = Date.now();
      const remainingMs = Math.max(0, this.unlockBlockedUntilEpochMs - now);
      if (remainingMs <= 0 && this.unlockBlockedUntilEpochMs !== 0) {
        this.unlockBlockedUntilEpochMs = 0;
      }
  
      return {
        failedAttempts: this.failedUnlockAttempts,
        blockedUntilEpochMs: this.unlockBlockedUntilEpochMs,
        remainingSeconds: Math.ceil(remainingMs / 1000),
      };
    }

  protected unlockDelayStatusFields(): Pick<SecurityStatus, "unlockDelaySeconds" | "unlockAvailableAt"> {
      const delay = this.currentUnlockDelay();
      if (delay.remainingSeconds <= 0) return {};
      return {
        unlockDelaySeconds: delay.remainingSeconds,
        unlockAvailableAt: new Date(delay.blockedUntilEpochMs).toISOString(),
      };
    }

  protected resetUnlockDelay(): void {
      this.failedUnlockAttempts = 0;
      this.unlockBlockedUntilEpochMs = 0;
    }

  protected recordFailedUnlockAttempt(): UnlockDelaySnapshot {
      this.failedUnlockAttempts += 1;
      const step = UNLOCK_DELAY_STEPS.find((candidate) => this.failedUnlockAttempts >= candidate.attempts);
      if (step) {
        const delayMs = Math.min(step.delayMs, MAX_UNLOCK_DELAY_MS);
        this.unlockBlockedUntilEpochMs = Date.now() + delayMs;
      }
      return this.currentUnlockDelay();
    }

  protected buildUnlockDelayError(delay: UnlockDelaySnapshot): string {
      if (delay.remainingSeconds <= 0) {
        return "Das Passwort ist nicht korrekt.";
      }
  
      if (delay.remainingSeconds >= 60) {
        const minutes = Math.ceil(delay.remainingSeconds / 60);
        return `Zu viele falsche Entsperrversuche. Bitte in etwa ${minutes} Minute${minutes === 1 ? "" : "n"} erneut versuchen.`;
      }
  
      return `Zu viele falsche Entsperrversuche. Bitte in ${delay.remainingSeconds} Sekunden erneut versuchen.`;
    }

  status(): SecurityStatus {
        const hasStore = this.hasPasswordStore();
        const hasProtectedData = this.hasProtectedData();
        const hasManifest = this.hasVaultManifest();
    
        if (hasStore) {
          return {
            initialized: true,
            unlocked: this.unlocked,
            setupRequired: false,
            recoveryRequired: false,
            destructiveResetAvailable: false,
            dataProtectionState: this.unlocked ? "unlocked" : "locked",
            databaseProtected: existsSync(this.vaultDatabasePath),
            ...this.unlockDelayStatusFields(),
          };
        }
    
        if (hasProtectedData || hasManifest) {
          return {
            initialized: true,
            unlocked: false,
            setupRequired: false,
            recoveryRequired: true,
            destructiveResetAvailable: true,
            dataProtectionState: hasManifest
              ? "recovery_required"
              : "sealed_without_recovery",
            databaseProtected: existsSync(this.vaultDatabasePath),
            error: hasManifest
              ? "Der Passwortnachweis fehlt. Der vorhandene Datenbestand kann nur mit Recovery-Key wieder freigegeben werden."
              : "Es wurde ein vorhandener Datenbestand ohne Sicherheitsmanifest gefunden. Ein neues Passwort kann nicht gesetzt werden, ohne die Daten zu verwerfen.",
          };
        }
    
        return {
          initialized: false,
          unlocked: false,
          setupRequired: true,
          recoveryRequired: false,
          destructiveResetAvailable: false,
          dataProtectionState: "not_initialized",
          databaseProtected: false,
        };
      }
}
