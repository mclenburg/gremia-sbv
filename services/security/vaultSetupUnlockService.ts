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
import { UnlockDelayService } from './unlockDelayService.js';
import { CURRENT_SCRYPT_PARAMS, VAULT_DATABASE_FILE_NAME, createRecoveryKey, derivePasswordVerifier, deriveRecoveryVerifier, formatVaultOpenError, needsKdfUpgrade, normalizeRecoveryKey, safeDestroyBuffer, safeEqualsHex, unwrapDatabaseKey, validatePassword, wrapDatabaseKey } from './securitySupport.js';
import {
  LegacyPlaintextExportCleanupService,
  buildLegacyPlaintextCleanupWarning,
  type LegacyPlaintextExportCleanupResult,
} from './legacyPlaintextExportCleanupService.js';

export class VaultSetupUnlockService extends UnlockDelayService {
  protected cleanupLegacyPlaintextExports(databaseKey: Buffer): LegacyPlaintextExportCleanupResult {
        let result: LegacyPlaintextExportCleanupResult;
        try {
          result = new LegacyPlaintextExportCleanupService().cleanup({ dataDir: this.dataDir, databaseKey });
        } catch {
          result = {
            converted: 0,
            recoveredExisting: 0,
            invalidPdf: 0,
            unsupported: 0,
            symbolicLinks: 0,
            failed: 1,
            requiresReview: 1,
          };
        }
        if (result.converted + result.recoveredExisting + result.requiresReview > 0) {
          this.auditSecurityEvent('cleanup', 'Automatische Prüfung alter Klartext-Berichtsexporte abgeschlossen', {
            converted: result.converted,
            recoveredExisting: result.recoveredExisting,
            invalidPdf: result.invalidPdf,
            unsupported: result.unsupported,
            symbolicLinks: result.symbolicLinks,
            failed: result.failed,
            requiresReview: result.requiresReview,
          });
        }
        return result;
      }

  protected validateInitialSetup(password: string): SecurityResult | null {
        const validationError = validatePassword(password);
              if (validationError) {
                return {
                  ok: false,
                  initialized: false,
                  unlocked: false,
                  error: validationError,
                };
              }
          
              const currentStatus = this.status();
              if (
                currentStatus.dataProtectionState === "locked" ||
                currentStatus.dataProtectionState === "unlocked"
              ) {
                return {
                  ok: false,
                  initialized: true,
                  unlocked: this.unlocked,
                  error: "Das Initialpasswort ist bereits eingerichtet.",
                };
              }
          
              if (currentStatus.recoveryRequired) {
                return {
                  ok: false,
                  initialized: true,
                  unlocked: false,
                  error:
                    "Es ist bereits ein geschützter Datenbestand vorhanden. Bitte Recovery-Key nutzen oder den Datenbestand bewusst verwerfen.",
                };
              }
        return null;
      }

  async setupInitialPassword(password: string): Promise<SecurityResult> {
        const setupError = this.validateInitialSetup(password);
        if (setupError) return setupError;
  
        this.ensureDataLayout();
    
        const now = new Date().toISOString();
        const vaultId = randomBytes(16).toString("hex");
        const passwordSalt = randomBytes(16).toString("hex");
        const passwordWrapSalt = randomBytes(16).toString("hex");
        const recoverySalt = randomBytes(16).toString("hex");
        const recoveryWrapSalt = randomBytes(16).toString("hex");
        const recoveryKey = createRecoveryKey();
        const databaseKey = randomBytes(32);
    
        const manifest: VaultManifest = {
          version: 3,
          vaultId,
          createdAt: now,
          updatedAt: now,
          database: {
            fileName: VAULT_DATABASE_FILE_NAME,
            cipher: "sqlcipher",
            createdAt: now,
          },
          recovery: {
            kdf: "scrypt",
            kdfParams: CURRENT_SCRYPT_PARAMS,
            salt: recoverySalt,
            verifier: deriveRecoveryVerifier(
              recoveryKey,
              recoverySalt,
              CURRENT_SCRYPT_PARAMS,
            ),
            databaseKeyWrap: wrapDatabaseKey(
              databaseKey,
              normalizeRecoveryKey(recoveryKey),
              recoveryWrapSalt,
              "gremia-sbv-dbkey-recovery-v1",
            ),
            createdAt: now,
          },
        };
    
        const store: PasswordStore = {
          version: 4,
          vaultId,
          kdf: "scrypt",
          kdfParams: CURRENT_SCRYPT_PARAMS,
          salt: passwordSalt,
          passwordVerifier: derivePasswordVerifier(
            password,
            passwordSalt,
            CURRENT_SCRYPT_PARAMS,
          ),
          databaseKeyWrap: wrapDatabaseKey(
            databaseKey,
            password,
            passwordWrapSalt,
            "gremia-sbv-dbkey-password-v1",
          ),
          createdAt: now,
          updatedAt: now,
        };
    
        try {
          this.writeManifest(manifest);
          this.writeStore(store);
          await this.openAndInitializeVaultDatabase(databaseKey);
          this.touchManifest(new Date().toISOString(), true);
        } catch (error) {
          this.databaseService.close(); this.tempFiles.cleanup();
          this.unlocked = false;
          this.destroyActiveDatabaseKey();
          safeDestroyBuffer(databaseKey);
          // Sicherheitsdateien stehen nur dann, wenn auch die verschlüsselte DB initialisiert wurde.
          rmSync(this.storePath, { force: true });
          rmSync(this.vaultManifestPath, { force: true });
          rmSync(this.vaultDatabasePath, { force: true });
          return {
            ok: false,
            initialized: false,
            unlocked: false,
            error: `Die verschlüsselte Datenbank konnte nicht initialisiert werden: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
    
        this.databaseKey = databaseKey;
        this.unlocked = true;
        this.resetUnlockDelay();
    
        return { ok: true, initialized: true, unlocked: true, recoveryKey };
      }

  async unlock(password: string): Promise<SecurityResult> {
        if (this.unlockInProgress) {
          return { ok: false, initialized: true, unlocked: false, error: "Ein Entsperrversuch läuft bereits. Bitte kurz warten." };
        }
        this.unlockInProgress = true;
        try {
          return await this.performUnlock(password);
        } finally {
          this.unlockInProgress = false;
        }
      }

  protected upgradePasswordKdfIfNeeded(
        store: PasswordStore,
        password: string,
        databaseKey: Buffer,
      ): void {
        if (!needsKdfUpgrade(store.kdfParams) && !needsKdfUpgrade(store.databaseKeyWrap.kdfParams)) return;
    
        const now = new Date().toISOString();
        const salt = randomBytes(16).toString("hex");
        const wrapSalt = randomBytes(16).toString("hex");
        const nextStore: PasswordStore = {
          version: 4,
          vaultId: store.vaultId,
          kdf: "scrypt",
          kdfParams: CURRENT_SCRYPT_PARAMS,
          salt,
          passwordVerifier: derivePasswordVerifier(
            password,
            salt,
            CURRENT_SCRYPT_PARAMS,
          ),
          databaseKeyWrap: wrapDatabaseKey(
            databaseKey,
            password,
            wrapSalt,
            "gremia-sbv-dbkey-password-v1",
          ),
          createdAt: store.createdAt,
          updatedAt: now,
        };
        this.commitSecurityArtifacts(nextStore, this.withManifestTimestamp(this.readManifest(), now));
      }

  protected async performUnlock(password: string): Promise<SecurityResult> {
      const activeDelay = this.currentUnlockDelay();
      if (activeDelay.remainingSeconds > 0) {
        return {
          ok: false,
          initialized: true,
          unlocked: false,
          error: this.buildUnlockDelayError(activeDelay),
          unlockDelaySeconds: activeDelay.remainingSeconds,
          unlockAvailableAt: new Date(activeDelay.blockedUntilEpochMs).toISOString(),
        };
      }
  
      let store: PasswordStore;
      try {
        store = this.readStore();
      } catch (error) {
        return { ok: false, initialized: true, unlocked: false, error: error instanceof Error ? error.message : "Die Passwortdatei konnte nicht gelesen werden." };
      }
  
      if (!this.hasVaultManifest()) {
        return {
          ok: false,
          initialized: true,
          unlocked: false,
          error:
            "Das Sicherheitsmanifest fehlt. Bitte Recovery prüfen oder ein Backup wiederherstellen.",
        };
      }
  
      try {
        this.assertStoreMatchesManifest(store);
      } catch (error) {
        return { ok: false, initialized: true, unlocked: false, error: error instanceof Error ? error.message : "Das Tresor-Manifest konnte nicht gelesen werden." };
      }
  
      const verifier = derivePasswordVerifier(password, store.salt, store.kdfParams);
      if (!safeEqualsHex(verifier, store.passwordVerifier)) {
        this.unlocked = false;
        this.destroyActiveDatabaseKey();
        const delay = this.recordFailedUnlockAttempt();
        return {
          ok: false,
          initialized: true,
          unlocked: false,
          error: this.buildUnlockDelayError(delay),
          ...(delay.remainingSeconds > 0
            ? {
                unlockDelaySeconds: delay.remainingSeconds,
                unlockAvailableAt: new Date(delay.blockedUntilEpochMs).toISOString(),
              }
            : {}),
        };
      }
  
      try {
        const databaseKey = unwrapDatabaseKey(
          store.databaseKeyWrap,
          password,
          "gremia-sbv-dbkey-password-v1",
        );
        await this.openAndInitializeVaultDatabase(databaseKey);
        this.destroyActiveDatabaseKey();
        this.databaseKey = databaseKey;
        this.unlocked = true;
        this.resetUnlockDelay();
        this.upgradePasswordKdfIfNeeded(store, password, databaseKey);
        this.auditSecurityEvent("unlock", "Tresor per Passwort entsperrt");
        const cleanup = this.cleanupLegacyPlaintextExports(databaseKey);
        return {
          ok: true,
          initialized: true,
          unlocked: true,
          warning: buildLegacyPlaintextCleanupWarning(cleanup),
        };
      } catch (error) {
        this.unlocked = false;
        this.destroyActiveDatabaseKey();
        this.databaseService.close();
        this.tempFiles.cleanup();
        const delay = this.recordFailedUnlockAttempt();
        return {
          ok: false,
          initialized: true,
          unlocked: false,
          error: `${formatVaultOpenError(error)}${delay.remainingSeconds > 0 ? ` ${this.buildUnlockDelayError(delay)}` : ""}`,
          ...(delay.remainingSeconds > 0
            ? {
                unlockDelaySeconds: delay.remainingSeconds,
                unlockAvailableAt: new Date(delay.blockedUntilEpochMs).toISOString(),
              }
            : {}),
        };
      }
    }
}
