import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
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
} from "../src/app/core/models/security.model.js";
import { DatabaseService } from "./databaseService.js";
import { PersonalDataAuditLogService } from "./auditLogService.js";
import {
  TempFileService,
  type TempFileCleanupResult,
  type TempFileStatus,
} from "./tempFileService.js";
import type { DatabaseAdapter } from "./databaseService.js";
import { MigrationService } from "./migrationService.js";

interface KeyWrap {
  version: 1;
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  kdfParams?: ScryptKdfParams;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

interface PasswordStore {
  version: 3 | 4;
  vaultId: string;
  kdf: "scrypt";
  kdfParams?: ScryptKdfParams;
  salt: string;
  passwordVerifier: string;
  databaseKeyWrap: KeyWrap;
  createdAt: string;
  updatedAt: string;
}

interface ScryptKdfParams {
  N: number;
  r: number;
  p: number;
  maxmem: number;
}

interface VaultManifest {
  version: 2 | 3;
  vaultId: string;
  createdAt: string;
  updatedAt: string;
  database: {
    fileName: string;
    cipher: "sqlcipher";
    createdAt: string;
    schemaInitializedAt?: string;
  };
  recovery: {
    kdf: "scrypt";
    kdfParams?: ScryptKdfParams;
    salt: string;
    verifier: string;
    databaseKeyWrap: KeyWrap;
    createdAt: string;
  };
}

const MIN_PASSWORD_LENGTH = 12;
const STORE_FILE_NAME = "security.json";
const VAULT_MANIFEST_FILE_NAME = "vault-manifest.json";
const VAULT_DATABASE_FILE_NAME = "gremia-sbv.vault.sqlite";
const DOCUMENTS_DIR_NAME = "documents";
const BACKUPS_DIR_NAME = "backups";
const EXPORTS_DIR_NAME = "exports";
const TMP_DIR_NAME = "tmp";
const RESET_CONFIRMATION = "DATENBESTAND LÖSCHEN";

interface UnlockDelaySnapshot {
  failedAttempts: number;
  blockedUntilEpochMs: number;
  remainingSeconds: number;
}

const UNLOCK_DELAY_STEPS = [
  { attempts: 7, delayMs: 5 * 60 * 1000 },
  { attempts: 5, delayMs: 60 * 1000 },
  { attempts: 3, delayMs: 30 * 1000 },
] as const;
const MAX_UNLOCK_DELAY_MS = 5 * 60 * 1000;

function getDataDir(): string {
  return process.env.GREMIA_SBV_DATA_DIR ?? path.join(process.cwd(), "data");
}

const LEGACY_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const CURRENT_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 131072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
};

function safeDestroyBuffer(buffer?: Buffer): void {
  if (!buffer) return;
  try {
    buffer.fill(0);
  } catch {
    // Best-effort: Buffer-Zeroing darf Sperren/Fehlerbehandlung nicht verhindern.
  }
}

function normalizeScryptParams(params?: ScryptKdfParams): ScryptKdfParams {
  return params ?? LEGACY_SCRYPT_PARAMS;
}

function deriveSecretKey(
  secret: string,
  saltHex: string,
  context: string,
  params?: ScryptKdfParams,
): Buffer {
  const salt = Buffer.from(saltHex, "hex");
  try {
    const effectiveParams = normalizeScryptParams(params);
    return scryptSync(`${context}:${secret}`, salt, 32, effectiveParams);
  } finally {
    safeDestroyBuffer(salt);
  }
}

function deriveVerifier(
  secret: string,
  saltHex: string,
  context: string,
  params?: ScryptKdfParams,
): string {
  const key = deriveSecretKey(secret, saltHex, context, params);
  try {
    return createHash("sha256")
      .update(context)
      .update(":")
      .update(key)
      .digest("hex");
  } finally {
    safeDestroyBuffer(key);
  }
}

function derivePasswordVerifier(
  password: string,
  saltHex: string,
  params?: ScryptKdfParams,
): string {
  return deriveVerifier(password, saltHex, "gremia-sbv-auth-v3", params);
}

function deriveRecoveryVerifier(
  recoveryKey: string,
  saltHex: string,
  params?: ScryptKdfParams,
): string {
  return deriveVerifier(
    normalizeRecoveryKey(recoveryKey),
    saltHex,
    "gremia-sbv-recovery-v2",
    params,
  );
}

function safeEqualsHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");

  try {
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  } finally {
    safeDestroyBuffer(a);
    safeDestroyBuffer(b);
  }
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  return null;
}

function normalizeRecoveryKey(recoveryKey: string): string {
  return recoveryKey.trim().replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

function formatRecoveryKey(rawHex: string): string {
  return (
    rawHex
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join("-") ?? rawHex.toUpperCase()
  );
}

function createRecoveryKey(): string {
  return formatRecoveryKey(randomBytes(24).toString("hex"));
}

function wrapDatabaseKey(
  databaseKey: Buffer,
  secret: string,
  saltHex: string,
  context: string,
  params = CURRENT_SCRYPT_PARAMS,
): KeyWrap {
  const kek = deriveSecretKey(secret, saltHex, context, params);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(databaseKey),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  try {
    return {
      version: 1,
      algorithm: "aes-256-gcm",
      kdf: "scrypt",
      kdfParams: params,
      salt: saltHex,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      ciphertext: ciphertext.toString("hex"),
    };
  } finally {
    safeDestroyBuffer(kek);
  }
}

function unwrapDatabaseKey(
  keyWrap: KeyWrap,
  secret: string,
  context: string,
): Buffer {
  const kek = deriveSecretKey(secret, keyWrap.salt, context, keyWrap.kdfParams);
  const iv = Buffer.from(keyWrap.iv, "hex");
  const tag = Buffer.from(keyWrap.tag, "hex");
  const ciphertext = Buffer.from(keyWrap.ciphertext, "hex");
  const decipher = createDecipheriv("aes-256-gcm", kek, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } finally {
    safeDestroyBuffer(kek);
    safeDestroyBuffer(iv);
    safeDestroyBuffer(tag);
    safeDestroyBuffer(ciphertext);
  }
}

function formatVaultOpenError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    /Migration .* fehlgeschlagen/i.test(message) ||
    /Datenbankschema unvollständig/i.test(message)
  ) {
    return `Die verschlüsselte Datenbank wurde geöffnet, aber die Schema-Migration ist fehlgeschlagen. ${message} Bitte Backup sichern und den Migrationsstatus prüfen.`;
  }

  if (
    /file is not a database|not a database|file is encrypted|bad decrypt|cipher|malformed/i.test(
      message,
    )
  ) {
    return `Die Datenbankdatei konnte mit dem entschlüsselten Schlüssel nicht gelesen werden. Das spricht für ein falsches Passwort, eine falsche Manifest-Datei, eine kopierte Datenbank aus einem anderen Tresor oder eine beschädigte Datenbankdatei. Technische Ursache: ${message}`;
  }

  if (/Passwortdatei und Datenbestand gehören nicht zusammen/i.test(message)) {
    return message;
  }

  return `Die Datenbank konnte nicht geöffnet werden. Technische Ursache: ${message}`;
}

export class SecurityService {
  private unlocked = false;
  private databaseKey?: Buffer;
  private failedUnlockAttempts = 0;
  private unlockBlockedUntilEpochMs = 0;
  private readonly dataDir: string;
  private readonly storePath: string;
  private readonly vaultManifestPath: string;
  private readonly vaultDatabasePath: string;
  private readonly databaseService = new DatabaseService();
  private readonly tempFiles: TempFileService;

  constructor(dataDir = getDataDir()) {
    this.dataDir = dataDir;
    this.storePath = path.join(dataDir, STORE_FILE_NAME);
    this.vaultManifestPath = path.join(dataDir, VAULT_MANIFEST_FILE_NAME);
    this.vaultDatabasePath = path.join(dataDir, VAULT_DATABASE_FILE_NAME);
    this.tempFiles = new TempFileService(dataDir);
    this.ensureDataLayout();
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

  private currentUnlockDelay(): UnlockDelaySnapshot {
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

  private unlockDelayStatusFields(): Pick<SecurityStatus, "unlockDelaySeconds" | "unlockAvailableAt"> {
    const delay = this.currentUnlockDelay();
    if (delay.remainingSeconds <= 0) return {};
    return {
      unlockDelaySeconds: delay.remainingSeconds,
      unlockAvailableAt: new Date(delay.blockedUntilEpochMs).toISOString(),
    };
  }

  private resetUnlockDelay(): void {
    this.failedUnlockAttempts = 0;
    this.unlockBlockedUntilEpochMs = 0;
  }

  private recordFailedUnlockAttempt(): UnlockDelaySnapshot {
    this.failedUnlockAttempts += 1;
    const step = UNLOCK_DELAY_STEPS.find((candidate) => this.failedUnlockAttempts >= candidate.attempts);
    if (step) {
      const delayMs = Math.min(step.delayMs, MAX_UNLOCK_DELAY_MS);
      this.unlockBlockedUntilEpochMs = Date.now() + delayMs;
    }
    return this.currentUnlockDelay();
  }

  private buildUnlockDelayError(delay: UnlockDelaySnapshot): string {
    if (delay.remainingSeconds <= 0) {
      return "Das Passwort ist nicht korrekt.";
    }

    if (delay.remainingSeconds >= 60) {
      const minutes = Math.ceil(delay.remainingSeconds / 60);
      return `Zu viele falsche Entsperrversuche. Bitte in etwa ${minutes} Minute${minutes === 1 ? "" : "n"} erneut versuchen.`;
    }

    return `Zu viele falsche Entsperrversuche. Bitte in ${delay.remainingSeconds} Sekunden erneut versuchen.`;
  }

  async setupInitialPassword(password: string): Promise<SecurityResult> {
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

    this.writeManifest(manifest);
    this.writeStore(store);

    try {
      await this.openAndInitializeVaultDatabase(databaseKey);
    } catch (error) {
      this.databaseService.close();
      this.unlocked = false;
      this.destroyActiveDatabaseKey();
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
    this.touchManifest(new Date().toISOString(), true);

    return { ok: true, initialized: true, unlocked: true, recoveryKey };
  }

  async unlock(password: string): Promise<SecurityResult> {
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

    const store = this.readStore();
    if (!store) {
      return {
        ok: false,
        initialized: false,
        unlocked: false,
        error: "Es ist noch kein Tresorpasswort eingerichtet.",
      };
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
      this.auditSecurityEvent("unlock", "Tresor per Passwort entsperrt");
      return { ok: true, initialized: true, unlocked: true };
    } catch (error) {
      this.unlocked = false;
      this.destroyActiveDatabaseKey();
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

    this.writeStore(nextStore);
    this.touchManifest(now);
    this.unlocked = true;
    return { ok: true, initialized: true, unlocked: true };
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

    try {
      const databaseKey = unwrapDatabaseKey(
        manifest.recovery.databaseKeyWrap,
        normalizedRecoveryKey,
        "gremia-sbv-dbkey-recovery-v1",
      );
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

      this.writeStore(store);
      this.touchManifest(now);
      this.databaseKey = databaseKey;
      this.unlocked = true;
      this.resetUnlockDelay();
      this.auditSecurityEvent("unlock", "Tresor per Recovery-Key entsperrt");
      return { ok: true, initialized: true, unlocked: true };
    } catch (error) {
      this.unlocked = false;
      this.destroyActiveDatabaseKey();
      this.databaseService.close();
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error:
          `Der Recovery-Key ist korrekt, aber die Datenbank konnte nicht geöffnet werden. Datenbankdatei und Manifest gehören möglicherweise nicht zusammen. ${error instanceof Error ? error.message : ""}`.trim(),
      };
    }
  }

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
    this.tempFiles.cleanup();
    this.unlocked = false;
    this.destroyActiveDatabaseKey();
    this.databaseService.close();
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

  cleanupStaleTemporaryFiles(): TempFileCleanupResult {
    return this.tempFiles.cleanupStale();
  }

  temporaryFileStatus(): TempFileStatus {
    return this.tempFiles.status();
  }

  writeTemporaryFile(
    scope: "document-preview" | "report-preview" | "report-render" | "misc",
    originalFileName: string,
    content: Buffer,
    prefix?: string,
  ): string {
    return this.tempFiles.write(scope, originalFileName, content, prefix);
  }

  private auditSecurityEvent(
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

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getActiveDatabase(): DatabaseAdapter {
    if (!this.unlocked) {
      throw new Error("Gremia.SBV ist gesperrt. Datenbankzugriff verweigert.");
    }
    return this.databaseService.active;
  }

  getActiveDatabaseKey(): Buffer {
    if (!this.unlocked || !this.databaseKey) {
      throw new Error("Gremia.SBV ist gesperrt. Schlüsselzugriff verweigert.");
    }
    return Buffer.from(this.databaseKey);
  }

  getDataDirectory(): string {
    return this.dataDir;
  }

  private destroyActiveDatabaseKey(): void {
    safeDestroyBuffer(this.databaseKey);
    this.databaseKey = undefined;
  }

  private hasPasswordStore(): boolean {
    return existsSync(this.storePath);
  }

  private hasVaultManifest(): boolean {
    return existsSync(this.vaultManifestPath);
  }

  private hasProtectedData(): boolean {
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

  private ensureDataLayout(): void {
    mkdirSync(this.dataDir, { recursive: true });
    mkdirSync(path.join(this.dataDir, DOCUMENTS_DIR_NAME), { recursive: true });
    mkdirSync(path.join(this.dataDir, BACKUPS_DIR_NAME), { recursive: true });
    mkdirSync(path.join(this.dataDir, EXPORTS_DIR_NAME), { recursive: true });
    mkdirSync(path.join(this.dataDir, TMP_DIR_NAME), { recursive: true });

    // Entschlüsselte Arbeitskopien dürfen keinen dauerhaften Nebenbestand bilden.
    // Beim Programmstart werden temporäre Vorschauen zentral entfernt; verschlüsselte Archive bleiben erhalten.
    this.tempFiles.cleanup();
  }

  private directoryHasUserFiles(directory: string): boolean {
    if (!existsSync(directory)) {
      return false;
    }
    return readdirSync(directory).length > 0;
  }

  private readStore(): PasswordStore {
    const raw = readFileSync(this.storePath, "utf8");
    const parsed = JSON.parse(raw) as { version?: number };

    if (parsed.version !== 3 && parsed.version !== 4) {
      throw new Error(
        "Veraltete Sicherheitsdatei erkannt. Bitte Entwicklungsdatenbestand zurücksetzen oder eine passende Migration einspielen.",
      );
    }

    return parsed as PasswordStore;
  }

  private readManifest(): VaultManifest {
    const raw = readFileSync(this.vaultManifestPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: number };

    if (parsed.version !== 2 && parsed.version !== 3) {
      throw new Error(
        "Veraltetes Tresor-Manifest erkannt. Bitte Entwicklungsdatenbestand zurücksetzen oder eine passende Migration einspielen.",
      );
    }

    return parsed as VaultManifest;
  }

  private writeStore(store: PasswordStore): void {
    mkdirSync(path.dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, `${JSON.stringify(store, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  private writeManifest(manifest: VaultManifest): void {
    mkdirSync(path.dirname(this.vaultManifestPath), { recursive: true });
    writeFileSync(
      this.vaultManifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }

  private touchManifest(updatedAt: string, schemaInitialized = false): void {
    if (!this.hasVaultManifest()) return;
    const manifest = this.readManifest();
    this.writeManifest({
      ...manifest,
      updatedAt,
      database: {
        ...manifest.database,
        schemaInitializedAt: schemaInitialized
          ? updatedAt
          : manifest.database.schemaInitializedAt,
      },
    });
  }

  private assertStoreMatchesManifest(store: PasswordStore): void {
    if (!this.hasVaultManifest()) return;
    const manifest = this.readManifest();
    if (store.vaultId !== manifest.vaultId) {
      this.unlocked = false;
      throw new Error("Passwortdatei und Datenbestand gehören nicht zusammen.");
    }
  }

  private async openAndInitializeVaultDatabase(
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

    if (result.applied.length || result.inferred.length) {
      console.log("Gremia.SBV database migrations:", {
        applied: result.applied,
        inferred: result.inferred,
        schemaVersion: result.currentSchemaVersion,
        diagnostics: result.diagnostics,
      });
    }
  }

  private resolveSchemaPath(): string {
    const electronProcess = process as NodeJS.Process & {
      resourcesPath?: string;
    };
    const candidates = [
      path.join(process.cwd(), "database", "schema.sql"),
      electronProcess.resourcesPath
        ? path.join(electronProcess.resourcesPath, "database", "schema.sql")
        : undefined,
      path.join(__dirname, "../database/schema.sql"),
      path.join(__dirname, "../../database/schema.sql"),
    ].filter((candidate): candidate is string => Boolean(candidate));

    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
      throw new Error(
        `Datenbankschema nicht gefunden. Geprüft: ${candidates.join(", ")}`,
      );
    }

    return match;
  }

  private resolveMigrationsDir(): string {
    const electronProcess = process as NodeJS.Process & {
      resourcesPath?: string;
    };
    const candidates = [
      path.join(process.cwd(), "database", "migrations"),
      electronProcess.resourcesPath
        ? path.join(electronProcess.resourcesPath, "database", "migrations")
        : undefined,
      path.join(__dirname, "../database/migrations"),
      path.join(__dirname, "../../database/migrations"),
    ].filter((candidate): candidate is string => Boolean(candidate));

    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
      throw new Error(
        `Datenbankmigrationen nicht gefunden. Geprüft: ${candidates.join(", ")}`,
      );
    }

    return match;
  }
}
