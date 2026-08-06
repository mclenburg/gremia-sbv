export { validateAppPassword } from "./passwordPolicy.js";

export interface ScryptKdfParams {
  N: number;
  r: number;
  p: number;
  maxmem: number;
}

export interface KeyWrap {
  version: 1;
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  kdfParams?: ScryptKdfParams;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

export interface PasswordStore {
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

export interface VaultManifest {
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

const MIN_SCRYPT_N = 32768;
const MAX_SCRYPT_N = 262144;
const MIN_SCRYPT_MEMORY = 64 * 1024 * 1024;
const MAX_SCRYPT_MEMORY = 512 * 1024 * 1024;

function assertHex(value: unknown, field: string, bytes?: number): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || !/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error(`Sicherheitsdatei ist beschädigt: ${field} ist kein gültiger Hex-Wert.`);
  }
  if (bytes !== undefined && value.length !== bytes * 2) {
    throw new Error(`Sicherheitsdatei ist beschädigt: ${field} hat eine ungültige Länge.`);
  }
}

function assertScryptParams(params: unknown, field: string, allowLegacyMissing: boolean): asserts params is ScryptKdfParams | undefined {
  if (params === undefined && allowLegacyMissing) return;
  if (!params || typeof params !== "object") throw new Error(`Sicherheitsdatei ist beschädigt: ${field} fehlt.`);
  const candidate = params as Partial<ScryptKdfParams>;
  if (!Number.isInteger(candidate.N) || candidate.N! < MIN_SCRYPT_N || candidate.N! > MAX_SCRYPT_N || (candidate.N! & (candidate.N! - 1)) !== 0) {
    throw new Error(`Sicherheitsdatei ist beschädigt: ${field}.N ist unzulässig.`);
  }
  if (candidate.r !== 8 || candidate.p !== 1 || !Number.isInteger(candidate.maxmem) || candidate.maxmem! < MIN_SCRYPT_MEMORY || candidate.maxmem! > MAX_SCRYPT_MEMORY) {
    throw new Error(`Sicherheitsdatei ist beschädigt: ${field} enthält unzulässige Parameter.`);
  }
}

function assertKeyWrap(value: unknown, field: string, allowLegacyKdf: boolean): asserts value is KeyWrap {
  if (!value || typeof value !== "object") throw new Error(`Sicherheitsdatei ist beschädigt: ${field} fehlt.`);
  const wrap = value as Partial<KeyWrap>;
  if (wrap.version !== 1 || wrap.algorithm !== "aes-256-gcm" || wrap.kdf !== "scrypt") throw new Error(`Sicherheitsdatei ist beschädigt: ${field} verwendet ein unbekanntes Format.`);
  assertScryptParams(wrap.kdfParams, `${field}.kdfParams`, allowLegacyKdf);
  assertHex(wrap.salt, `${field}.salt`, 16);
  assertHex(wrap.iv, `${field}.iv`, 12);
  assertHex(wrap.tag, `${field}.tag`, 16);
  assertHex(wrap.ciphertext, `${field}.ciphertext`, 32);
}

export function validatePasswordStore(value: unknown): PasswordStore {
  if (!value || typeof value !== "object") throw new Error("Passwortdatei ist beschädigt.");
  const store = value as Partial<PasswordStore>;
  if (store.version !== 3 && store.version !== 4) throw new Error("Unbekannte Version der Passwortdatei. Bitte ein kompatibles Backup verwenden.");
  if (typeof store.vaultId !== "string" || !/^[0-9a-f]{32}$/i.test(store.vaultId)) throw new Error("Passwortdatei ist beschädigt: vaultId fehlt oder ist ungültig.");
  if (store.kdf !== "scrypt") throw new Error("Passwortdatei ist beschädigt: unbekanntes KDF-Verfahren.");
  assertScryptParams(store.kdfParams, "kdfParams", store.version === 3);
  assertHex(store.salt, "salt", 16);
  assertHex(store.passwordVerifier, "passwordVerifier", 32);
  assertKeyWrap(store.databaseKeyWrap, "databaseKeyWrap", store.version === 3);
  if (typeof store.createdAt !== "string" || typeof store.updatedAt !== "string") throw new Error("Passwortdatei ist beschädigt: Zeitstempel fehlen.");
  return store as PasswordStore;
}

export function validateVaultManifest(value: unknown, expectedDatabaseFileName: string): VaultManifest {
  if (!value || typeof value !== "object") throw new Error("Tresor-Manifest ist beschädigt.");
  const manifest = value as Partial<VaultManifest>;
  if (manifest.version !== 2 && manifest.version !== 3) throw new Error("Unbekannte Version des Tresor-Manifests. Bitte ein kompatibles Backup verwenden.");
  if (typeof manifest.vaultId !== "string" || !/^[0-9a-f]{32}$/i.test(manifest.vaultId)) throw new Error("Tresor-Manifest ist beschädigt: vaultId fehlt oder ist ungültig.");
  if (!manifest.database || manifest.database.fileName !== expectedDatabaseFileName || manifest.database.cipher !== "sqlcipher") throw new Error("Tresor-Manifest ist beschädigt: Datenbankangaben sind ungültig.");
  if (!manifest.recovery || manifest.recovery.kdf !== "scrypt") throw new Error("Tresor-Manifest ist beschädigt: Recovery-Angaben fehlen.");
  assertScryptParams(manifest.recovery.kdfParams, "recovery.kdfParams", manifest.version === 2);
  assertHex(manifest.recovery.salt, "recovery.salt", 16);
  assertHex(manifest.recovery.verifier, "recovery.verifier", 32);
  assertKeyWrap(manifest.recovery.databaseKeyWrap, "recovery.databaseKeyWrap", manifest.version === 2);
  return manifest as VaultManifest;
}
