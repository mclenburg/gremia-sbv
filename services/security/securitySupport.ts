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

export interface SecurityFileOperations {
  readonly atomicWriteFileSync: typeof atomicWriteFileSync;
}

export interface SecurityRuntimeEnvironment {
  readonly isPackaged: boolean;
  readonly resourcesPath?: string;
  readonly workingDirectory: string;
}

export const DEFAULT_SECURITY_FILE_OPERATIONS: SecurityFileOperations = Object.freeze({ atomicWriteFileSync });

export const DEFAULT_SECURITY_RUNTIME_ENVIRONMENT: SecurityRuntimeEnvironment = Object.freeze({
  isPackaged: false,
  resourcesPath: undefined,
  workingDirectory: process.cwd(),
});

export const STORE_FILE_NAME = "security.json";

export const VAULT_MANIFEST_FILE_NAME = "vault-manifest.json";

export const VAULT_DATABASE_FILE_NAME = "gremia-sbv.vault.sqlite";

export const DOCUMENTS_DIR_NAME = "documents";

export const BACKUPS_DIR_NAME = "backups";

export const EXPORTS_DIR_NAME = "exports";

export const TMP_DIR_NAME = "tmp";

export const RESET_CONFIRMATION = "DATENBESTAND LÖSCHEN";

export interface UnlockDelaySnapshot {
  failedAttempts: number;
  blockedUntilEpochMs: number;
  remainingSeconds: number;
}

export const UNLOCK_DELAY_STEPS = [
  { attempts: 7, delayMs: 5 * 60 * 1000 },
  { attempts: 5, delayMs: 60 * 1000 },
  { attempts: 3, delayMs: 30 * 1000 },
] as const;

export const MAX_UNLOCK_DELAY_MS = 5 * 60 * 1000;

export function getDataDir(): string {
  return process.env.GREMIA_SBV_DATA_DIR ?? path.join(process.cwd(), "data");
}

export const LEGACY_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

export const CURRENT_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 131072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
};

export function safeDestroyBuffer(buffer?: Buffer): void {
  if (!buffer) return;
  try {
    buffer.fill(0);
  } catch {
    // Best-effort: Buffer-Zeroing darf Sperren/Fehlerbehandlung nicht verhindern.
  }
}

export function normalizeScryptParams(params?: ScryptKdfParams): ScryptKdfParams {
  return params ?? LEGACY_SCRYPT_PARAMS;
}

export function needsKdfUpgrade(params?: ScryptKdfParams): boolean {
  return !params || params.N < CURRENT_SCRYPT_PARAMS.N || params.r !== CURRENT_SCRYPT_PARAMS.r || params.p !== CURRENT_SCRYPT_PARAMS.p;
}

export function deriveSecretKey(
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

export function deriveVerifier(
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

export function derivePasswordVerifier(
  password: string,
  saltHex: string,
  params?: ScryptKdfParams,
): string {
  return deriveVerifier(password, saltHex, "gremia-sbv-auth-v3", params);
}

export function deriveRecoveryVerifier(
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

export function safeEqualsHex(aHex: string, bHex: string): boolean {
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

export function validatePassword(password: string): string | null {
  return validateAppPassword(password);
}

export function normalizeRecoveryKey(recoveryKey: string): string {
  return recoveryKey.trim().replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

export function formatRecoveryKey(rawHex: string): string {
  return (
    rawHex
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join("-") ?? rawHex.toUpperCase()
  );
}

export function createRecoveryKey(): string {
  return formatRecoveryKey(randomBytes(24).toString("hex"));
}

export function wrapDatabaseKey(
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

export function unwrapDatabaseKey(
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

export function formatVaultOpenError(error: unknown): string {
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
