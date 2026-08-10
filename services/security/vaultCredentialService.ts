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
} from "../../src/app/core/models/security.model.js";
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
import { VaultSetupUnlockService } from './vaultSetupUnlockService.js';
import { CURRENT_SCRYPT_PARAMS, VAULT_DATABASE_FILE_NAME, createRecoveryKey, derivePasswordVerifier, deriveRecoveryVerifier, needsKdfUpgrade, normalizeRecoveryKey, safeDestroyBuffer, safeEqualsHex, unwrapDatabaseKey, validatePassword, wrapDatabaseKey } from './securitySupport.js';

export class VaultCredentialService extends VaultSetupUnlockService {
  async changePassword(
        currentPassword: string,
        newPassword: string,
      ): Promise<SecurityResult> {
        if (!this.hasPasswordStore()) {
          return {
            ok: false,
            initialized: false,
            unlocked: false,
            error: "Es wurde noch kein Initialpasswort eingerichtet.",
          };
        }
    
        const validationError = validatePassword(newPassword);
        if (validationError) {
          return {
            ok: false,
            initialized: true,
            unlocked: this.unlocked,
            error: validationError,
          };
        }
    
        const currentResult = await this.unlock(currentPassword);
        if (!currentResult.ok || !this.databaseKey) {
          return {
            ok: false,
            initialized: true,
            unlocked: false,
            error: "Das aktuelle Passwort ist nicht korrekt.",
          };
        }
    
        const previousStore = this.readStore();
        const now = new Date().toISOString();
        const salt = randomBytes(16).toString("hex");
        const wrapSalt = randomBytes(16).toString("hex");
        const nextStore: PasswordStore = {
          version: 4,
          vaultId: previousStore.vaultId,
          kdf: "scrypt",
          kdfParams: CURRENT_SCRYPT_PARAMS,
          salt,
          passwordVerifier: derivePasswordVerifier(
            newPassword,
            salt,
            CURRENT_SCRYPT_PARAMS,
          ),
          databaseKeyWrap: wrapDatabaseKey(
            this.databaseKey,
            newPassword,
            wrapSalt,
            "gremia-sbv-dbkey-password-v1",
          ),
          createdAt: previousStore.createdAt,
          updatedAt: now,
        };
    
        try {
          const currentManifest = this.readManifest();
          this.commitSecurityArtifacts(nextStore, this.withManifestTimestamp(currentManifest, now));
          this.unlocked = true;
          return { ok: true, initialized: true, unlocked: true };
        } catch {
          return {
            ok: false,
            initialized: true,
            unlocked: this.unlocked,
            error: "Das neue Passwort konnte nicht dauerhaft gespeichert werden. Der bisherige Passwortstand bleibt gültig.",
          };
        }
      }

  async resetPasswordWithRecoveryKey(
        recoveryKey: string,
        newPassword: string,
      ): Promise<SecurityResult> {
        const status = this.status();
        if (!status.recoveryRequired && !this.hasVaultManifest()) {
          return {
            ok: false,
            initialized: false,
            unlocked: false,
            error:
              "Für diesen Datenbestand ist kein Recovery-Verfahren eingerichtet.",
          };
        }
    
        if (!this.hasVaultManifest()) {
          return {
            ok: false,
            initialized: true,
            unlocked: false,
            error:
              "Recovery ist nicht möglich, weil das Sicherheitsmanifest fehlt. Ohne vorhandenes Passwort bleibt nur ein neuer leerer Datenbestand.",
          };
        }
    
        const validationError = validatePassword(newPassword);
        if (validationError) {
          return {
            ok: false,
            initialized: true,
            unlocked: false,
            error: validationError,
          };
        }
    
        const normalizedRecoveryKey = normalizeRecoveryKey(recoveryKey);
        const manifest = this.readManifest();
        const verifier = deriveRecoveryVerifier(
          normalizedRecoveryKey,
          manifest.recovery.salt,
          manifest.recovery.kdfParams,
        );
        if (!safeEqualsHex(verifier, manifest.recovery.verifier)) {
          return {
            ok: false,
            initialized: true,
            unlocked: false,
            error: "Der Recovery-Key ist nicht korrekt.",
          };
        }
    
        let recoveredDatabaseKey: Buffer | undefined;
        try {
          const databaseKey = unwrapDatabaseKey(
            manifest.recovery.databaseKeyWrap,
            normalizedRecoveryKey,
            "gremia-sbv-dbkey-recovery-v1",
          );
          recoveredDatabaseKey = databaseKey;
          await this.openAndInitializeVaultDatabase(databaseKey);
    
          const now = new Date().toISOString();
          const salt = randomBytes(16).toString("hex");
          const wrapSalt = randomBytes(16).toString("hex");
          const store: PasswordStore = {
            version: 4,
            vaultId: manifest.vaultId,
            kdf: "scrypt",
            kdfParams: CURRENT_SCRYPT_PARAMS,
            salt,
            passwordVerifier: derivePasswordVerifier(
              newPassword,
              salt,
              CURRENT_SCRYPT_PARAMS,
            ),
            databaseKeyWrap: wrapDatabaseKey(
              databaseKey,
              newPassword,
              wrapSalt,
              "gremia-sbv-dbkey-password-v1",
            ),
            createdAt: manifest.createdAt,
            updatedAt: now,
          };
    
          this.commitSecurityArtifacts(store, this.withManifestTimestamp(manifest, now));
          this.databaseKey = databaseKey;
          recoveredDatabaseKey = undefined;
          this.unlocked = true;
          this.resetUnlockDelay();
          this.auditSecurityEvent("unlock", "Tresor per Recovery-Key entsperrt");
          return { ok: true, initialized: true, unlocked: true };
        } catch (error) {
          this.unlocked = false;
          this.destroyActiveDatabaseKey();
          safeDestroyBuffer(recoveredDatabaseKey);
          this.databaseService.close();
          this.tempFiles.cleanup();
          return {
            ok: false,
            initialized: true,
            unlocked: false,
            error:
              `Der Recovery-Key ist korrekt, aber die Datenbank konnte nicht geöffnet werden. Datenbankdatei und Manifest gehören möglicherweise nicht zusammen. ${error instanceof Error ? error.message : ""}`.trim(),
          };
        }
      }
}
