import {
  existsSync,
  readFileSync,
} from "node:fs";
import path from 'node:path';
import type {
  SecurityStatus,
} from "../../src/domain/models/security.model.js";
import { VaultDatabaseRuntime } from './vaultDatabaseRuntime.js';
import { MAX_UNLOCK_DELAY_MS, UNLOCK_DELAY_STEPS } from './securitySupport.js';
import type { UnlockDelaySnapshot } from './securitySupport.js';

export class UnlockDelayService extends VaultDatabaseRuntime {
  private unlockDelayLoaded = false;

  private unlockDelayFile(): string {
    return path.join(this.dataDir, 'unlock-delay.json');
  }

  private loadUnlockDelay(): void {
    if (this.unlockDelayLoaded) return;
    this.unlockDelayLoaded = true;
    if (!existsSync(this.unlockDelayFile())) return;
    try {
      const state: unknown = JSON.parse(readFileSync(this.unlockDelayFile(), 'utf8'));
      if (!state || typeof state !== 'object') throw new Error('Ungültiger Zustand');
      const { failedAttempts, blockedUntilEpochMs } = state as Record<string, unknown>;
      if (!Number.isSafeInteger(failedAttempts) || Number(failedAttempts) < 0 || Number(failedAttempts) > 1_000_000 ||
          !Number.isSafeInteger(blockedUntilEpochMs) || Number(blockedUntilEpochMs) < 0) {
        throw new Error('Ungültiger Zustand');
      }
      this.failedUnlockAttempts = Number(failedAttempts);
      this.unlockBlockedUntilEpochMs = Number(blockedUntilEpochMs);
    } catch {
      // Ein beschädigter Schutzstatus darf die Sperre nicht stillschweigend aufheben.
      this.failedUnlockAttempts = 7;
      this.unlockBlockedUntilEpochMs = Date.now() + MAX_UNLOCK_DELAY_MS;
    }
  }

  private persistUnlockDelay(): void {
    this.fileOperations.atomicWriteFileSync(this.unlockDelayFile(), JSON.stringify({
      failedAttempts: this.failedUnlockAttempts,
      blockedUntilEpochMs: this.unlockBlockedUntilEpochMs,
    }));
  }

  protected currentUnlockDelay(): UnlockDelaySnapshot {
      this.loadUnlockDelay();
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
      this.loadUnlockDelay();
      this.failedUnlockAttempts = 0;
      this.unlockBlockedUntilEpochMs = 0;
      this.persistUnlockDelay();
    }

  protected recordFailedUnlockAttempt(): UnlockDelaySnapshot {
      this.loadUnlockDelay();
      this.failedUnlockAttempts += 1;
      const step = UNLOCK_DELAY_STEPS.find((candidate) => this.failedUnlockAttempts >= candidate.attempts);
      if (step) {
        const delayMs = Math.min(step.delayMs, MAX_UNLOCK_DELAY_MS);
        this.unlockBlockedUntilEpochMs = Date.now() + delayMs;
      }
      this.persistUnlockDelay();
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
