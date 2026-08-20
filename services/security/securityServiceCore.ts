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
import { BACKUPS_DIR_NAME, DEFAULT_SECURITY_FILE_OPERATIONS, DEFAULT_SECURITY_RUNTIME_ENVIRONMENT, DOCUMENTS_DIR_NAME, EXPORTS_DIR_NAME, STORE_FILE_NAME, TMP_DIR_NAME, VAULT_DATABASE_FILE_NAME, VAULT_MANIFEST_FILE_NAME, getDataDir, safeDestroyBuffer } from './securitySupport.js';
import type { SecurityFileOperations, SecurityRuntimeEnvironment } from './securitySupport.js';

export class SecurityServiceCore {
  protected unlocked = false;

  protected databaseKey?: Buffer;

  protected failedUnlockAttempts = 0;

  protected unlockBlockedUntilEpochMs = 0;

  protected readonly dataDir: string;

  protected readonly storePath: string;

  protected readonly vaultManifestPath: string;

  protected readonly vaultDatabasePath: string;

  protected readonly databaseService = new DatabaseService();

  protected readonly tempFiles: TempFileService;

  protected unlockInProgress = false;

  protected readonly fileOperations: SecurityFileOperations;

  protected readonly runtimeEnvironment: SecurityRuntimeEnvironment;

  constructor(
    dataDir = getDataDir(),
    fileOperations: SecurityFileOperations = DEFAULT_SECURITY_FILE_OPERATIONS,
    runtimeEnvironment: SecurityRuntimeEnvironment = DEFAULT_SECURITY_RUNTIME_ENVIRONMENT,
  ) {
      this.dataDir = dataDir;
      this.fileOperations = fileOperations;
      this.runtimeEnvironment = runtimeEnvironment;
      this.storePath = path.join(dataDir, STORE_FILE_NAME);
      this.vaultManifestPath = path.join(dataDir, VAULT_MANIFEST_FILE_NAME);
      this.vaultDatabasePath = path.join(dataDir, VAULT_DATABASE_FILE_NAME);
      this.tempFiles = new TempFileService(dataDir);
      this.ensureDataLayout();
    }



  protected destroyActiveDatabaseKey(): void {
      safeDestroyBuffer(this.databaseKey);
      this.databaseKey = undefined;
    }

  protected hasPasswordStore(): boolean {
      return existsSync(this.storePath);
    }

  protected hasVaultManifest(): boolean {
      return existsSync(this.vaultManifestPath);
    }

  protected hasProtectedData(): boolean {
      if (!existsSync(this.dataDir)) {
        return false;
      }
  
      if (this.hasVaultManifest()) {
        return true;
      }
  
      if (existsSync(this.vaultDatabasePath)) {
        return true;
      }
  
      const names = readdirSync(this.dataDir, { withFileTypes: true });
      return names.some((entry) => {
        if (
          entry.name === STORE_FILE_NAME ||
          entry.name === VAULT_MANIFEST_FILE_NAME
        )
          return false;
        if (entry.isDirectory()) {
          if (
            ![DOCUMENTS_DIR_NAME, BACKUPS_DIR_NAME, EXPORTS_DIR_NAME].includes(
              entry.name,
            )
          )
            return false;
          return this.directoryHasUserFiles(path.join(this.dataDir, entry.name));
        }
        return /\.(sqlite|sqlite3|db|gremia-sbv|gsbv)$/i.test(entry.name);
      });
    }

  protected ensureDataLayout(): void {
      mkdirSync(this.dataDir, { recursive: true });
      mkdirSync(path.join(this.dataDir, DOCUMENTS_DIR_NAME), { recursive: true });
      mkdirSync(path.join(this.dataDir, BACKUPS_DIR_NAME), { recursive: true });
      mkdirSync(path.join(this.dataDir, EXPORTS_DIR_NAME), { recursive: true });
      mkdirSync(path.join(this.dataDir, TMP_DIR_NAME), { recursive: true });
  
      // Entschlüsselte Arbeitskopien dürfen keinen dauerhaften Nebenbestand bilden.
      // Beim Programmstart werden temporäre Vorschauen zentral entfernt; verschlüsselte Archive bleiben erhalten.
      this.tempFiles.cleanup();
    }

  protected directoryHasUserFiles(directory: string): boolean {
      if (!existsSync(directory)) {
        return false;
      }
      return readdirSync(directory).length > 0;
    }

  protected readStore(): PasswordStore {
      try {
        return validatePasswordStore(JSON.parse(readFileSync(this.storePath, "utf8")) as unknown);
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error("Passwortdatei ist beschädigt und enthält kein gültiges JSON.");
        throw error;
      }
    }

  protected readManifest(): VaultManifest {
      try {
        return validateVaultManifest(JSON.parse(readFileSync(this.vaultManifestPath, "utf8")) as unknown, VAULT_DATABASE_FILE_NAME);
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error("Tresor-Manifest ist beschädigt und enthält kein gültiges JSON.");
        throw error;
      }
    }

  protected writeStore(store: PasswordStore): void {
      mkdirSync(path.dirname(this.storePath), { recursive: true });
      this.fileOperations.atomicWriteFileSync(this.storePath, `${JSON.stringify(store, null, 2)}\n`);
    }

  protected writeManifest(manifest: VaultManifest): void {
      mkdirSync(path.dirname(this.vaultManifestPath), { recursive: true });
      this.fileOperations.atomicWriteFileSync(this.vaultManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }

  protected touchManifest(updatedAt: string, schemaInitialized = false): void {
      if (!this.hasVaultManifest()) return;
      this.writeManifest(this.withManifestTimestamp(this.readManifest(), updatedAt, schemaInitialized));
    }

  protected assertStoreMatchesManifest(store: PasswordStore): void {
      if (!this.hasVaultManifest()) return;
      const manifest = this.readManifest();
      if (store.vaultId !== manifest.vaultId) {
        this.unlocked = false;
        throw new Error("Passwortdatei und Datenbestand gehören nicht zusammen.");
      }
    }

  protected auditSecurityEvent(
        eventType: "lock" | "unlock" | "cleanup",
        purpose: string,
        metadata?: Record<string, unknown>,
      ): void {
        if (!this.unlocked) return;
        try {
          new PersonalDataAuditLogService(this.databaseService.active).append({
            action: "security",
            subjectType: "security_session",
            purpose,
            metadata: { eventType, ...metadata },
          });
        } catch {
          // Sicherheitsaktionen dürfen nicht scheitern, nur weil Audit-Logging nicht verfügbar ist.
        }
      }

  protected commitSecurityArtifacts(store: PasswordStore, manifest: VaultManifest): void {
      commitAtomicArtifacts([
        { path: this.storePath, content: `${JSON.stringify(store, null, 2)}\n` },
        { path: this.vaultManifestPath, content: `${JSON.stringify(manifest, null, 2)}\n` },
      ], this.fileOperations.atomicWriteFileSync);
    }

  protected withManifestTimestamp(
      manifest: VaultManifest,
      updatedAt: string,
      schemaInitialized = false,
    ): VaultManifest {
      return {
        ...manifest,
        updatedAt,
        database: {
          ...manifest.database,
          schemaInitializedAt: schemaInitialized
            ? updatedAt
            : manifest.database.schemaInitializedAt,
        },
      };
    }
}
