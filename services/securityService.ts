import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from 'node:crypto';
import type { SecurityResult, SecurityStatus } from '../src/app/core/models/security.model.js';
import { DatabaseService } from './databaseService.js';
import type { DatabaseAdapter } from './databaseService.js';

interface KeyWrap {
  version: 1;
  algorithm: 'aes-256-gcm';
  kdf: 'scrypt';
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

interface PasswordStore {
  version: 3;
  vaultId: string;
  kdf: 'scrypt';
  salt: string;
  passwordVerifier: string;
  databaseKeyWrap: KeyWrap;
  createdAt: string;
  updatedAt: string;
}

interface VaultManifest {
  version: 2;
  vaultId: string;
  createdAt: string;
  updatedAt: string;
  database: {
    fileName: string;
    cipher: 'sqlcipher';
    createdAt: string;
    schemaInitializedAt?: string;
  };
  recovery: {
    kdf: 'scrypt';
    salt: string;
    verifier: string;
    databaseKeyWrap: KeyWrap;
    createdAt: string;
  };
}

const MIN_PASSWORD_LENGTH = 12;
const STORE_FILE_NAME = 'security.json';
const VAULT_MANIFEST_FILE_NAME = 'vault-manifest.json';
const VAULT_DATABASE_FILE_NAME = 'gremia-sbv.vault.sqlite';
const DOCUMENTS_DIR_NAME = 'documents';
const BACKUPS_DIR_NAME = 'backups';
const EXPORTS_DIR_NAME = 'exports';
const TMP_DIR_NAME = 'tmp';
const RESET_CONFIRMATION = 'DATENBESTAND LÖSCHEN';

function getDataDir(): string {
  return process.env.GREMIA_SBV_DATA_DIR ?? path.join(process.cwd(), 'data');
}

function deriveSecretKey(secret: string, saltHex: string, context: string): Buffer {
  const salt = Buffer.from(saltHex, 'hex');
  return scryptSync(`${context}:${secret}`, salt, 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
}

function deriveVerifier(secret: string, saltHex: string, context: string): string {
  const key = deriveSecretKey(secret, saltHex, context);
  return createHash('sha256').update(context).update(':').update(key).digest('hex');
}

function derivePasswordVerifier(password: string, saltHex: string): string {
  return deriveVerifier(password, saltHex, 'gremia-sbv-auth-v3');
}

function deriveRecoveryVerifier(recoveryKey: string, saltHex: string): string {
  return deriveVerifier(normalizeRecoveryKey(recoveryKey), saltHex, 'gremia-sbv-recovery-v2');
}

function safeEqualsHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  return null;
}

function normalizeRecoveryKey(recoveryKey: string): string {
  return recoveryKey.trim().replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}

function formatRecoveryKey(rawHex: string): string {
  return rawHex.toUpperCase().match(/.{1,4}/g)?.join('-') ?? rawHex.toUpperCase();
}

function createRecoveryKey(): string {
  return formatRecoveryKey(randomBytes(24).toString('hex'));
}

function wrapDatabaseKey(databaseKey: Buffer, secret: string, saltHex: string, context: string): KeyWrap {
  const kek = deriveSecretKey(secret, saltHex, context);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', kek, iv);
  const ciphertext = Buffer.concat([cipher.update(databaseKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: saltHex,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext.toString('hex')
  };
}

function unwrapDatabaseKey(keyWrap: KeyWrap, secret: string, context: string): Buffer {
  const kek = deriveSecretKey(secret, keyWrap.salt, context);
  const decipher = createDecipheriv('aes-256-gcm', kek, Buffer.from(keyWrap.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(keyWrap.tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(keyWrap.ciphertext, 'hex')), decipher.final()]);
}

export class SecurityService {
  private unlocked = false;
  private databaseKey?: Buffer;
  private readonly dataDir: string;
  private readonly storePath: string;
  private readonly vaultManifestPath: string;
  private readonly vaultDatabasePath: string;
  private readonly databaseService = new DatabaseService();

  constructor(dataDir = getDataDir()) {
    this.dataDir = dataDir;
    this.storePath = path.join(dataDir, STORE_FILE_NAME);
    this.vaultManifestPath = path.join(dataDir, VAULT_MANIFEST_FILE_NAME);
    this.vaultDatabasePath = path.join(dataDir, VAULT_DATABASE_FILE_NAME);
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
        dataProtectionState: this.unlocked ? 'unlocked' : 'locked',
        databaseProtected: existsSync(this.vaultDatabasePath)
      };
    }

    if (hasProtectedData || hasManifest) {
      return {
        initialized: true,
        unlocked: false,
        setupRequired: false,
        recoveryRequired: true,
        destructiveResetAvailable: true,
        dataProtectionState: hasManifest ? 'recovery_required' : 'sealed_without_recovery',
        databaseProtected: existsSync(this.vaultDatabasePath),
        error: hasManifest
          ? 'Der Passwortnachweis fehlt. Der vorhandene Datenbestand kann nur mit Recovery-Key wieder freigegeben werden.'
          : 'Es wurde ein vorhandener Datenbestand ohne Sicherheitsmanifest gefunden. Ein neues Passwort kann nicht gesetzt werden, ohne die Daten zu verwerfen.'
      };
    }

    return {
      initialized: false,
      unlocked: false,
      setupRequired: true,
      recoveryRequired: false,
      destructiveResetAvailable: false,
      dataProtectionState: 'not_initialized',
      databaseProtected: false
    };
  }

  async setupInitialPassword(password: string): Promise<SecurityResult> {
    const validationError = validatePassword(password);
    if (validationError) {
      return { ok: false, initialized: false, unlocked: false, error: validationError };
    }

    const currentStatus = this.status();
    if (currentStatus.dataProtectionState === 'locked' || currentStatus.dataProtectionState === 'unlocked') {
      return { ok: false, initialized: true, unlocked: this.unlocked, error: 'Das Initialpasswort ist bereits eingerichtet.' };
    }

    if (currentStatus.recoveryRequired) {
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error: 'Es ist bereits ein geschützter Datenbestand vorhanden. Bitte Recovery-Key nutzen oder den Datenbestand bewusst verwerfen.'
      };
    }

    this.ensureDataLayout();

    const now = new Date().toISOString();
    const vaultId = randomBytes(16).toString('hex');
    const passwordSalt = randomBytes(16).toString('hex');
    const passwordWrapSalt = randomBytes(16).toString('hex');
    const recoverySalt = randomBytes(16).toString('hex');
    const recoveryWrapSalt = randomBytes(16).toString('hex');
    const recoveryKey = createRecoveryKey();
    const databaseKey = randomBytes(32);

    const manifest: VaultManifest = {
      version: 2,
      vaultId,
      createdAt: now,
      updatedAt: now,
      database: {
        fileName: VAULT_DATABASE_FILE_NAME,
        cipher: 'sqlcipher',
        createdAt: now
      },
      recovery: {
        kdf: 'scrypt',
        salt: recoverySalt,
        verifier: deriveRecoveryVerifier(recoveryKey, recoverySalt),
        databaseKeyWrap: wrapDatabaseKey(databaseKey, normalizeRecoveryKey(recoveryKey), recoveryWrapSalt, 'gremia-sbv-dbkey-recovery-v1'),
        createdAt: now
      }
    };

    const store: PasswordStore = {
      version: 3,
      vaultId,
      kdf: 'scrypt',
      salt: passwordSalt,
      passwordVerifier: derivePasswordVerifier(password, passwordSalt),
      databaseKeyWrap: wrapDatabaseKey(databaseKey, password, passwordWrapSalt, 'gremia-sbv-dbkey-password-v1'),
      createdAt: now,
      updatedAt: now
    };

    this.writeManifest(manifest);
    this.writeStore(store);

    try {
      await this.openAndInitializeVaultDatabase(databaseKey);
    } catch (error) {
      this.databaseService.close();
      this.unlocked = false;
      this.databaseKey = undefined;
      // Sicherheitsdateien stehen nur dann, wenn auch die verschlüsselte DB initialisiert wurde.
      rmSync(this.storePath, { force: true });
      rmSync(this.vaultManifestPath, { force: true });
      rmSync(this.vaultDatabasePath, { force: true });
      return {
        ok: false,
        initialized: false,
        unlocked: false,
        error: `Die verschlüsselte Datenbank konnte nicht initialisiert werden: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    this.databaseKey = databaseKey;
    this.unlocked = true;
    this.touchManifest(new Date().toISOString(), true);

    return { ok: true, initialized: true, unlocked: true, recoveryKey };
  }

  async unlock(password: string): Promise<SecurityResult> {
    const currentStatus = this.status();
    if (currentStatus.recoveryRequired) {
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error: currentStatus.error ?? 'Recovery erforderlich.'
      };
    }

    if (!this.hasPasswordStore()) {
      return { ok: false, initialized: false, unlocked: false, error: 'Es wurde noch kein Initialpasswort eingerichtet.' };
    }

    const store = this.readStore();
    const verifier = derivePasswordVerifier(password, store.salt);

    if (!safeEqualsHex(verifier, store.passwordVerifier)) {
      this.unlocked = false;
      this.databaseKey = undefined;
      this.databaseService.close();
      return { ok: false, initialized: true, unlocked: false, error: 'Das Passwort ist nicht korrekt.' };
    }

    try {
      this.assertStoreMatchesManifest(store);
      const databaseKey = unwrapDatabaseKey(store.databaseKeyWrap, password, 'gremia-sbv-dbkey-password-v1');
      await this.openAndInitializeVaultDatabase(databaseKey);
      this.databaseKey = databaseKey;
      this.unlocked = true;
      return { ok: true, initialized: true, unlocked: true };
    } catch (error) {
      this.unlocked = false;
      this.databaseKey = undefined;
      this.databaseService.close();
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error: `Die verschlüsselte Datenbank konnte nicht geöffnet werden. Passwort, Manifest und Datenbankdatei passen nicht zusammen. ${error instanceof Error ? error.message : ''}`.trim()
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<SecurityResult> {
    if (!this.hasPasswordStore()) {
      return { ok: false, initialized: false, unlocked: false, error: 'Es wurde noch kein Initialpasswort eingerichtet.' };
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      return { ok: false, initialized: true, unlocked: this.unlocked, error: validationError };
    }

    const currentResult = await this.unlock(currentPassword);
    if (!currentResult.ok || !this.databaseKey) {
      return { ok: false, initialized: true, unlocked: false, error: 'Das aktuelle Passwort ist nicht korrekt.' };
    }

    const previousStore = this.readStore();
    const now = new Date().toISOString();
    const salt = randomBytes(16).toString('hex');
    const wrapSalt = randomBytes(16).toString('hex');
    const nextStore: PasswordStore = {
      version: 3,
      vaultId: previousStore.vaultId,
      kdf: 'scrypt',
      salt,
      passwordVerifier: derivePasswordVerifier(newPassword, salt),
      databaseKeyWrap: wrapDatabaseKey(this.databaseKey, newPassword, wrapSalt, 'gremia-sbv-dbkey-password-v1'),
      createdAt: previousStore.createdAt,
      updatedAt: now
    };

    this.writeStore(nextStore);
    this.touchManifest(now);
    this.unlocked = true;
    return { ok: true, initialized: true, unlocked: true };
  }

  async resetPasswordWithRecoveryKey(recoveryKey: string, newPassword: string): Promise<SecurityResult> {
    const status = this.status();
    if (!status.recoveryRequired && !this.hasVaultManifest()) {
      return { ok: false, initialized: false, unlocked: false, error: 'Für diesen Datenbestand ist kein Recovery-Verfahren eingerichtet.' };
    }

    if (!this.hasVaultManifest()) {
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error: 'Recovery ist nicht möglich, weil das Sicherheitsmanifest fehlt. Ohne vorhandenes Passwort bleibt nur ein neuer leerer Datenbestand.'
      };
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      return { ok: false, initialized: true, unlocked: false, error: validationError };
    }

    const normalizedRecoveryKey = normalizeRecoveryKey(recoveryKey);
    const manifest = this.readManifest();
    const verifier = deriveRecoveryVerifier(normalizedRecoveryKey, manifest.recovery.salt);
    if (!safeEqualsHex(verifier, manifest.recovery.verifier)) {
      return { ok: false, initialized: true, unlocked: false, error: 'Der Recovery-Key ist nicht korrekt.' };
    }

    try {
      const databaseKey = unwrapDatabaseKey(manifest.recovery.databaseKeyWrap, normalizedRecoveryKey, 'gremia-sbv-dbkey-recovery-v1');
      await this.openAndInitializeVaultDatabase(databaseKey);

      const now = new Date().toISOString();
      const salt = randomBytes(16).toString('hex');
      const wrapSalt = randomBytes(16).toString('hex');
      const store: PasswordStore = {
        version: 3,
        vaultId: manifest.vaultId,
        kdf: 'scrypt',
        salt,
        passwordVerifier: derivePasswordVerifier(newPassword, salt),
        databaseKeyWrap: wrapDatabaseKey(databaseKey, newPassword, wrapSalt, 'gremia-sbv-dbkey-password-v1'),
        createdAt: manifest.createdAt,
        updatedAt: now
      };

      this.writeStore(store);
      this.touchManifest(now);
      this.databaseKey = databaseKey;
      this.unlocked = true;
      return { ok: true, initialized: true, unlocked: true };
    } catch (error) {
      this.unlocked = false;
      this.databaseKey = undefined;
      this.databaseService.close();
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error: `Der Recovery-Key ist korrekt, aber die Datenbank konnte nicht geöffnet werden. Datenbankdatei und Manifest gehören möglicherweise nicht zusammen. ${error instanceof Error ? error.message : ''}`.trim()
      };
    }
  }

  destroyLocalVault(confirmation: string): SecurityResult {
    if (confirmation !== RESET_CONFIRMATION) {
      return {
        ok: false,
        initialized: this.status().initialized,
        unlocked: false,
        error: `Bitte exakt „${RESET_CONFIRMATION}“ eingeben.`
      };
    }

    this.unlocked = false;
    this.databaseKey = undefined;
    this.databaseService.close();
    rmSync(this.dataDir, { recursive: true, force: true });
    this.ensureDataLayout();
    return { ok: true, initialized: false, unlocked: false };
  }

  lock(): void {
    this.unlocked = false;
    this.databaseKey = undefined;
    this.databaseService.close();
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getActiveDatabase(): DatabaseAdapter {
    if (!this.unlocked) {
      throw new Error('Gremia.SBV ist gesperrt. Datenbankzugriff verweigert.');
    }
    return this.databaseService.active;
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
      if (entry.name === STORE_FILE_NAME || entry.name === VAULT_MANIFEST_FILE_NAME) return false;
      if (entry.isDirectory()) {
        if (![DOCUMENTS_DIR_NAME, BACKUPS_DIR_NAME, EXPORTS_DIR_NAME].includes(entry.name)) return false;
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
  }

  private directoryHasUserFiles(directory: string): boolean {
    if (!existsSync(directory)) {
      return false;
    }
    return readdirSync(directory).length > 0;
  }

  private readStore(): PasswordStore {
    const raw = readFileSync(this.storePath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: number };

    if (parsed.version !== 3) {
      throw new Error('Veraltete Sicherheitsdatei erkannt. Bitte Entwicklungsdatenbestand zurücksetzen oder eine passende Migration einspielen.');
    }

    return parsed as PasswordStore;
  }

  private readManifest(): VaultManifest {
    const raw = readFileSync(this.vaultManifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: number };

    if (parsed.version !== 2) {
      throw new Error('Veraltetes Tresor-Manifest erkannt. Bitte Entwicklungsdatenbestand zurücksetzen oder eine passende Migration einspielen.');
    }

    return parsed as VaultManifest;
  }

  private writeStore(store: PasswordStore): void {
    mkdirSync(path.dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, `${JSON.stringify(store, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  private writeManifest(manifest: VaultManifest): void {
    mkdirSync(path.dirname(this.vaultManifestPath), { recursive: true });
    writeFileSync(this.vaultManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  private touchManifest(updatedAt: string, schemaInitialized = false): void {
    if (!this.hasVaultManifest()) return;
    const manifest = this.readManifest();
    this.writeManifest({
      ...manifest,
      updatedAt,
      database: {
        ...manifest.database,
        schemaInitializedAt: schemaInitialized ? updatedAt : manifest.database.schemaInitializedAt
      }
    });
  }

  private assertStoreMatchesManifest(store: PasswordStore): void {
    if (!this.hasVaultManifest()) return;
    const manifest = this.readManifest();
    if (store.vaultId !== manifest.vaultId) {
      this.unlocked = false;
      throw new Error('Passwortdatei und Datenbestand gehören nicht zusammen.');
    }
  }

  private async openAndInitializeVaultDatabase(databaseKey: Buffer): Promise<void> {
    this.ensureDataLayout();
    const schemaPath = this.resolveSchemaPath();
    const schemaSql = readFileSync(schemaPath, 'utf8');

    const db = await this.databaseService.open(this.vaultDatabasePath, databaseKey.toString('hex'));
    db.exec(schemaSql);
  }

  private resolveSchemaPath(): string {
    const electronProcess = process as NodeJS.Process & { resourcesPath?: string };
    const candidates = [
      path.join(process.cwd(), 'database', 'schema.sql'),
      electronProcess.resourcesPath ? path.join(electronProcess.resourcesPath, 'database', 'schema.sql') : undefined,
      path.join(__dirname, '../database/schema.sql'),
      path.join(__dirname, '../../database/schema.sql')
    ].filter((candidate): candidate is string => Boolean(candidate));

    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
      throw new Error(`Datenbankschema nicht gefunden. Geprüft: ${candidates.join(', ')}`);
    }

    return match;
  }
}
