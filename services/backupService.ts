import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { SecurityService } from './securityService.js';
import type { BackupFileSummary, BackupInspectionResult, BackupOperationResult } from '../src/domain/models/backup.model.js';
import { APP_VERSION } from './generated/appMetadata.js';
import { APP_SCHEMA_VERSION, DATABASE_SCHEMA_VERSION_KEY, LEGACY_DATABASE_SCHEMA_VERSION_KEY } from './appSchema.js';
import { atomicWriteFileSync } from './secureFileOperations.js';

export interface BackupFileOperations {
  readonly atomicWriteFileSync: typeof atomicWriteFileSync;
  readonly mkdirSync: typeof mkdirSync;
  readonly renameSync: typeof renameSync;
  readonly rmSync: typeof rmSync;
  readonly writeFileSync: typeof writeFileSync;
}

const DEFAULT_BACKUP_FILE_OPERATIONS: BackupFileOperations = Object.freeze({
  atomicWriteFileSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
});

const BACKUP_FORMAT = 'gremia-sbv-encrypted-backup';
const BACKUP_VERSION = 1;
const RESTORE_CONFIRMATION = 'BACKUP WIEDERHERSTELLEN';
const MIN_BACKUP_PASSPHRASE_LENGTH = 12;
const MAX_BACKUP_FILE_COUNT = 100_000;
const MAX_BACKUP_FILE_SIZE = 4 * 1024 * 1024 * 1024;
const MAX_BACKUP_TOTAL_SIZE = 8 * 1024 * 1024 * 1024;
const MAX_BACKUP_SCRYPT_N = 262144;
const MAX_BACKUP_SCRYPT_MEMORY = 512 * 1024 * 1024;

interface ScryptKdfParams {
  N: number;
  r: number;
  p: number;
  maxmem: number;
}

export const LEGACY_BACKUP_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
};

export const CURRENT_BACKUP_SCRYPT_PARAMS: ScryptKdfParams = {
  N: 131072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024
};

interface BackupPayloadFile extends BackupFileSummary {
  contentBase64: string;
}

interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  appVersion: string;
  createdAt: string;
  schemaVersion?: string;
  files: BackupPayloadFile[];
}

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  algorithm: 'aes-256-gcm';
  kdf: 'scrypt';
  kdfParams?: ScryptKdfParams;
  compression: 'gzip';
  createdAt: string;
  appVersion: string;
  salt: string;
  iv: string;
  tag: string;
  payload: string;
}

function assertPassphrase(passphrase: string): void {
  if (!passphrase || passphrase.length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    throw new Error(`Die Backup-Passphrase muss mindestens ${MIN_BACKUP_PASSPHRASE_LENGTH} Zeichen lang sein.`);
  }
}

function normalizeBackupKdfParams(params?: ScryptKdfParams): ScryptKdfParams {
  const effective = params ?? LEGACY_BACKUP_SCRYPT_PARAMS;
  if (!Number.isInteger(effective.N) || effective.N < LEGACY_BACKUP_SCRYPT_PARAMS.N || effective.N > MAX_BACKUP_SCRYPT_N || (effective.N & (effective.N - 1)) !== 0 || effective.r !== 8 || effective.p !== 1 || !Number.isInteger(effective.maxmem) || effective.maxmem < LEGACY_BACKUP_SCRYPT_PARAMS.maxmem || effective.maxmem > MAX_BACKUP_SCRYPT_MEMORY) {
    throw new Error('Das Backup enthält unzulässige KDF-Parameter.');
  }
  return effective;
}

function safeDestroyBuffer(buffer?: Buffer): void {
  if (!buffer) return;
  try {
    buffer.fill(0);
  } catch {
    // Best effort: Backup-Erzeugung/Restore nicht durch Buffer-Zeroing blockieren.
  }
}

function deriveBackupKey(passphrase: string, saltHex: string, params?: ScryptKdfParams): Buffer {
  const salt = Buffer.from(saltHex, 'hex');
  try {
    return scryptSync(`gremia-sbv-backup-v1:${passphrase}`, salt, 32, normalizeBackupKdfParams(params));
  } finally {
    safeDestroyBuffer(salt);
  }
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function safeBackupFileName(date = new Date()): string {
  return `Gremia.SBV-Backup-${date.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.gsbvbackup`;
}

function walkFiles(root: string, relativeBase = ''): string[] {
  const absoluteBase = path.join(root, relativeBase);
  if (!existsSync(absoluteBase)) return [];

  const result: string[] = [];
  for (const entry of readdirSync(absoluteBase, { withFileTypes: true })) {
    const relativePath = path.join(relativeBase, entry.name);
    const normalized = relativePath.split(path.sep).join('/');

    if (entry.isDirectory()) {
      if (normalized === 'tmp' || normalized.startsWith('tmp/')) continue;
      if (normalized === 'backups' || normalized.startsWith('backups/')) continue;
      result.push(...walkFiles(root, relativePath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (normalized.startsWith('tmp/') || normalized.startsWith('backups/')) continue;
    result.push(normalized);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function buildBackupPrivacyWarnings(files: BackupPayloadFile[]): string[] {
  const warnings: string[] = [];
  warnings.push('Backup enthält den verschlüsselten Gremia.SBV-Tresor einschließlich SBV-, BEM- und Gesundheitsdaten.');
  warnings.push('Backup-Passphrase getrennt vom Backup aufbewahren; ohne Passphrase ist keine Wiederherstellung möglich.');
  if (files.some((file) => file.relativePath.includes('exports/'))) {
    warnings.push('Backup enthält verschlüsselte Berichtsexporte. Weitergabe nur an berechtigte Personen.');
  }
  if (files.some((file) => file.relativePath.includes('documents/'))) {
    warnings.push('Backup enthält Fall- und Dokumentenablagen. Lösch- und Aufbewahrungsfristen beachten.');
  }
  return warnings;
}

function schemaVersionWarning(schemaVersion?: string): string | undefined {
  if (!schemaVersion) return 'Schema-Version im Backup konnte nicht ermittelt werden.';
  if (schemaVersion !== APP_SCHEMA_VERSION) return `Backup-Schema ${schemaVersion} weicht von der erwarteten Schema-Version ${APP_SCHEMA_VERSION} ab. Restore nur nach Prüfung durchführen.`;
  return undefined;
}

function readSchemaVersion(security: SecurityService): string | undefined {
  try {
    const db = security.getActiveDatabase();
    const row = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(DATABASE_SCHEMA_VERSION_KEY);
    if (row?.value) return row.value;
    const legacyRow = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(LEGACY_DATABASE_SCHEMA_VERSION_KEY);
    return legacyRow?.value;
  } catch {
    return undefined;
  }
}

function assertRelativePath(relativePath: string): void {
  if (!relativePath || relativePath.includes('\\') || path.posix.isAbsolute(relativePath)) {
    throw new Error(`Ungültiger Pfad im Backup: ${relativePath}`);
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../') || relativePath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Ungültiger Pfad im Backup: ${relativePath}`);
  }
}

function assertCanonicalBase64(value: string, label: string): void {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`${label} enthält keine gültigen Base64-Daten.`);
  }
}

export class BackupService {
  constructor(
    private readonly security: SecurityService,
    private readonly fileOperations: BackupFileOperations = DEFAULT_BACKUP_FILE_OPERATIONS,
  ) {}

  createBackup(targetFilePath: string, passphrase: string): BackupOperationResult {
    try {
      assertPassphrase(passphrase);
      const dataDir = this.security.getDataDirectory();
      this.fileOperations.mkdirSync(path.dirname(targetFilePath), { recursive: true });

      try {
        this.security.getActiveDatabase().pragma('wal_checkpoint(TRUNCATE)');
      } catch {
        // Nicht jede SQLite-/SQLCipher-Konfiguration nutzt WAL. Backup läuft trotzdem weiter.
      }

      const createdAt = new Date().toISOString();
      const files = walkFiles(dataDir).map((relativePath): BackupPayloadFile => {
        const absolutePath = path.join(dataDir, relativePath);
        const content = readFileSync(absolutePath);
        return {
          relativePath,
          sizeBytes: content.length,
          sha256: sha256(content),
          contentBase64: content.toString('base64')
        };
      });

      const payload: BackupPayload = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        appVersion: APP_VERSION,
        createdAt,
        schemaVersion: readSchemaVersion(this.security),
        files
      };

      const payloadBuffer = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
      const salt = randomBytes(16).toString('hex');
      const iv = randomBytes(12);
      const key = deriveBackupKey(passphrase, salt, CURRENT_BACKUP_SCRYPT_PARAMS);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(`${BACKUP_FORMAT}:${BACKUP_VERSION}`, 'utf8'));
      const ciphertext = Buffer.concat([cipher.update(payloadBuffer), cipher.final()]);

      const envelope: BackupEnvelope = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        algorithm: 'aes-256-gcm',
        kdf: 'scrypt',
        kdfParams: CURRENT_BACKUP_SCRYPT_PARAMS,
        compression: 'gzip',
        createdAt,
        appVersion: APP_VERSION,
        salt,
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex'),
        payload: ciphertext.toString('base64')
      };

      this.fileOperations.atomicWriteFileSync(targetFilePath, `${JSON.stringify(envelope, null, 2)}\n`);
      safeDestroyBuffer(key);

      return {
        ok: true,
        filePath: targetFilePath,
        fileName: path.basename(targetFilePath),
        createdAt,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
        warnings: buildBackupPrivacyWarnings(files)
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error), warnings: [] };
    }
  }

  inspectBackup(filePath: string, passphrase: string): BackupInspectionResult {
    try {
      const payload = this.readBackupPayload(filePath, passphrase);
      this.verifyPayload(payload);
      return {
        ok: true,
        filePath,
        fileName: path.basename(filePath),
        verifiedAt: new Date().toISOString(),
        format: payload.format,
        backupVersion: payload.version,
        appVersion: payload.appVersion,
        schemaVersion: payload.schemaVersion,
        createdAt: payload.createdAt,
        fileCount: payload.files.length,
        totalBytes: payload.files.reduce((sum, file) => sum + file.sizeBytes, 0),
        files: payload.files.map(({ contentBase64: _contentBase64, ...summary }) => summary),
        warnings: [
          ...buildBackupPrivacyWarnings(payload.files),
          ...(schemaVersionWarning(payload.schemaVersion) ? [schemaVersionWarning(payload.schemaVersion)!] : [])
        ]
      };
    } catch (error) {
      return { ok: false, filePath, fileName: path.basename(filePath), error: error instanceof Error ? error.message : String(error), warnings: [] };
    }
  }

  restoreBackup(filePath: string, passphrase: string, confirmation: string): BackupOperationResult {
    let stagingDir: string | undefined;
    let backupOfCurrent: string | undefined;
    try {
      if (confirmation !== RESTORE_CONFIRMATION) throw new Error(`Bitte exakt „${RESTORE_CONFIRMATION}“ eingeben.`);
      const payload = this.readBackupPayload(filePath, passphrase);
      this.verifyPayload(payload);

      const dataDir = this.security.getDataDirectory();
      const parentDir = path.dirname(dataDir);
      const suffix = new Date().toISOString().replace(/[:.]/g, '-');
      backupOfCurrent = path.join(parentDir, `${path.basename(dataDir)}.before-restore.${suffix}`);
      stagingDir = path.join(parentDir, `.${path.basename(dataDir)}.restore-staging.${process.pid}.${suffix}`);
      this.fileOperations.mkdirSync(parentDir, { recursive: true });
      this.fileOperations.rmSync(stagingDir, { recursive: true, force: true });
      this.fileOperations.mkdirSync(stagingDir, { recursive: false });

      for (const file of payload.files) {
        assertRelativePath(file.relativePath);
        const content = Buffer.from(file.contentBase64, 'base64');
        if (sha256(content) !== file.sha256 || content.length !== file.sizeBytes) throw new Error(`Prüfsumme nach Entschlüsselung ungültig: ${file.relativePath}`);
        const target = path.join(stagingDir, ...file.relativePath.split('/'));
        this.fileOperations.mkdirSync(path.dirname(target), { recursive: true });
        this.fileOperations.writeFileSync(target, content, { mode: 0o600 });
      }
      this.fileOperations.mkdirSync(path.join(stagingDir, 'documents'), { recursive: true });
      this.fileOperations.mkdirSync(path.join(stagingDir, 'exports'), { recursive: true });
      this.fileOperations.mkdirSync(path.join(stagingDir, 'tmp'), { recursive: true });
      this.fileOperations.mkdirSync(path.join(stagingDir, 'backups'), { recursive: true });

      this.security.lock();
      if (existsSync(dataDir)) this.fileOperations.renameSync(dataDir, backupOfCurrent);
      try {
        this.fileOperations.renameSync(stagingDir, dataDir);
        stagingDir = undefined;
      } catch (error) {
        if (existsSync(dataDir)) this.fileOperations.rmSync(dataDir, { recursive: true, force: true });
        if (backupOfCurrent && existsSync(backupOfCurrent)) this.fileOperations.renameSync(backupOfCurrent, dataDir);
        throw error;
      }

      return {
        ok: true,
        restoredAt: new Date().toISOString(), filePath, fileName: path.basename(filePath),
        fileCount: payload.files.length,
        totalBytes: payload.files.reduce((sum, file) => sum + file.sizeBytes, 0),
        warnings: [`Der vorherige Datenbestand wurde gesichert unter: ${backupOfCurrent}`, ...buildBackupPrivacyWarnings(payload.files), ...(schemaVersionWarning(payload.schemaVersion) ? [schemaVersionWarning(payload.schemaVersion)!] : [])],
        restartRequired: true
      };
    } catch (error) {
      if (stagingDir) this.fileOperations.rmSync(stagingDir, { recursive: true, force: true });
      return { ok: false, filePath, fileName: path.basename(filePath), error: error instanceof Error ? error.message : String(error), warnings: [] };
    }
  }

  defaultBackupPath(): string {
    const backupsDir = path.join(this.security.getDataDirectory(), 'backups');
    this.fileOperations.mkdirSync(backupsDir, { recursive: true });
    return path.join(backupsDir, safeBackupFileName());
  }

  private readBackupPayload(filePath: string, passphrase: string): BackupPayload {
    assertPassphrase(passphrase);
    let envelope: BackupEnvelope;
    try { envelope = JSON.parse(readFileSync(filePath, 'utf8')) as BackupEnvelope; }
    catch (error) { throw new Error(error instanceof SyntaxError ? 'Die Backup-Datei enthält kein gültiges JSON.' : String(error)); }
    if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION || envelope.algorithm !== 'aes-256-gcm' || envelope.kdf !== 'scrypt' || envelope.compression !== 'gzip') throw new Error('Die Datei ist kein unterstütztes Gremia.SBV-Backup.');
    if (![envelope.salt, envelope.iv, envelope.tag].every((value) => typeof value === 'string' && /^[0-9a-f]+$/i.test(value))) throw new Error('Der Backup-Umschlag ist beschädigt.');
    if (envelope.salt.length !== 32 || envelope.iv.length !== 24 || envelope.tag.length !== 32 || typeof envelope.payload !== 'string' || envelope.payload.length === 0) throw new Error('Der Backup-Umschlag ist unvollständig.');
    assertCanonicalBase64(envelope.payload, 'Der Backup-Umschlag');

    const key = deriveBackupKey(passphrase, envelope.salt, envelope.kdfParams);
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'hex'));
      decipher.setAAD(Buffer.from(`${BACKUP_FORMAT}:${BACKUP_VERSION}`, 'utf8'));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
      const compressed = Buffer.concat([decipher.update(Buffer.from(envelope.payload, 'base64')), decipher.final()]);
      return JSON.parse(gunzipSync(compressed).toString('utf8')) as BackupPayload;
    } finally { safeDestroyBuffer(key); }
  }

  private verifyPayload(payload: BackupPayload): void {
    if (payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION || !Array.isArray(payload.files) || payload.files.length > MAX_BACKUP_FILE_COUNT) {
      throw new Error('Das Backup-Manifest ist ungültig.');
    }

    const seen = new Set<string>();
    let totalSize = 0;
    for (const file of payload.files) {
      if (!file || typeof file.relativePath !== 'string' || typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(file.sha256) || typeof file.contentBase64 !== 'string' || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0 || file.sizeBytes > MAX_BACKUP_FILE_SIZE) {
        throw new Error('Das Backup-Manifest enthält einen ungültigen Dateieintrag.');
      }
      assertRelativePath(file.relativePath);
      assertCanonicalBase64(file.contentBase64, `Datei ${file.relativePath}`);
      totalSize += file.sizeBytes;
      if (!Number.isSafeInteger(totalSize) || totalSize > MAX_BACKUP_TOTAL_SIZE) {
        throw new Error('Das Backup überschreitet die zulässige Gesamtgröße.');
      }
      if (seen.has(file.relativePath)) {
        throw new Error(`Doppelter Dateieintrag im Backup: ${file.relativePath}`);
      }
      seen.add(file.relativePath);
      const content = Buffer.from(file.contentBase64, 'base64');
      if (content.length !== file.sizeBytes || sha256(content) !== file.sha256) {
        throw new Error(`Prüfsumme ungültig: ${file.relativePath}`);
      }
    }

    const required = ['gremia-sbv.vault.sqlite', 'security.json', 'vault-manifest.json'];
    for (const requiredFile of required) {
      if (!seen.has(requiredFile)) {
        throw new Error(`Pflichtdatei fehlt im Backup: ${requiredFile}`);
      }
    }
  }
}
