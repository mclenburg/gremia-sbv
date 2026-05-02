import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { SecurityService } from './securityService.js';
import type { BackupFileSummary, BackupInspectionResult, BackupOperationResult } from '../src/app/core/models/backup.model.js';

const BACKUP_FORMAT = 'gremia-sbv-encrypted-backup';
const BACKUP_VERSION = 1;
const CURRENT_APP_VERSION = '0.3.41';
const RESTORE_CONFIRMATION = 'BACKUP WIEDERHERSTELLEN';
const MIN_BACKUP_PASSPHRASE_LENGTH = 12;

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

function deriveBackupKey(passphrase: string, saltHex: string): Buffer {
  return scryptSync(`gremia-sbv-backup-v1:${passphrase}`, Buffer.from(saltHex, 'hex'), 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
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

function readSchemaVersion(security: SecurityService): string | undefined {
  try {
    const db = security.getActiveDatabase();
    const row = db.prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'settings.database.schema.version'").get();
    return row?.value;
  } catch {
    return undefined;
  }
}

function assertRelativePath(relativePath: string): void {
  if (!relativePath || relativePath.startsWith('/') || relativePath.includes('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Ungültiger Pfad im Backup: ${relativePath}`);
  }
}

export class BackupService {
  constructor(private readonly security: SecurityService) {}

  createBackup(targetFilePath: string, passphrase: string): BackupOperationResult {
    try {
      assertPassphrase(passphrase);
      const dataDir = this.security.getDataDirectory();
      mkdirSync(path.dirname(targetFilePath), { recursive: true });

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
        appVersion: CURRENT_APP_VERSION,
        createdAt,
        schemaVersion: readSchemaVersion(this.security),
        files
      };

      const payloadBuffer = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
      const salt = randomBytes(16).toString('hex');
      const iv = randomBytes(12);
      const key = deriveBackupKey(passphrase, salt);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(`${BACKUP_FORMAT}:${BACKUP_VERSION}`, 'utf8'));
      const ciphertext = Buffer.concat([cipher.update(payloadBuffer), cipher.final()]);

      const envelope: BackupEnvelope = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        algorithm: 'aes-256-gcm',
        kdf: 'scrypt',
        compression: 'gzip',
        createdAt,
        appVersion: CURRENT_APP_VERSION,
        salt,
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex'),
        payload: ciphertext.toString('base64')
      };

      writeFileSync(targetFilePath, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });

      return {
        ok: true,
        filePath: targetFilePath,
        fileName: path.basename(targetFilePath),
        createdAt,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
        warnings: []
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
        warnings: []
      };
    } catch (error) {
      return { ok: false, filePath, fileName: path.basename(filePath), error: error instanceof Error ? error.message : String(error), warnings: [] };
    }
  }

  restoreBackup(filePath: string, passphrase: string, confirmation: string): BackupOperationResult {
    try {
      if (confirmation !== RESTORE_CONFIRMATION) {
        throw new Error(`Bitte exakt „${RESTORE_CONFIRMATION}“ eingeben.`);
      }

      const payload = this.readBackupPayload(filePath, passphrase);
      this.verifyPayload(payload);

      const dataDir = this.security.getDataDirectory();
      const parentDir = path.dirname(dataDir);
      const backupOfCurrent = path.join(parentDir, `${path.basename(dataDir)}.before-restore.${new Date().toISOString().replace(/[:.]/g, '-')}`);

      this.security.lock();
      mkdirSync(parentDir, { recursive: true });

      if (existsSync(dataDir)) {
        renameSync(dataDir, backupOfCurrent);
      }
      mkdirSync(dataDir, { recursive: true });

      try {
        for (const file of payload.files) {
          assertRelativePath(file.relativePath);
          const content = Buffer.from(file.contentBase64, 'base64');
          if (sha256(content) !== file.sha256 || content.length !== file.sizeBytes) {
            throw new Error(`Prüfsumme nach Entschlüsselung ungültig: ${file.relativePath}`);
          }
          const target = path.join(dataDir, file.relativePath);
          mkdirSync(path.dirname(target), { recursive: true });
          writeFileSync(target, content, { mode: 0o600 });
        }
      } catch (error) {
        rmSync(dataDir, { recursive: true, force: true });
        if (existsSync(backupOfCurrent)) {
          renameSync(backupOfCurrent, dataDir);
        }
        throw error;
      }

      mkdirSync(path.join(dataDir, 'tmp'), { recursive: true });
      mkdirSync(path.join(dataDir, 'backups'), { recursive: true });

      return {
        ok: true,
        restoredAt: new Date().toISOString(),
        filePath,
        fileName: path.basename(filePath),
        fileCount: payload.files.length,
        totalBytes: payload.files.reduce((sum, file) => sum + file.sizeBytes, 0),
        warnings: [`Der vorherige Datenbestand wurde gesichert unter: ${backupOfCurrent}`],
        restartRequired: true
      };
    } catch (error) {
      return { ok: false, filePath, fileName: path.basename(filePath), error: error instanceof Error ? error.message : String(error), warnings: [] };
    }
  }

  defaultBackupPath(): string {
    const backupsDir = path.join(this.security.getDataDirectory(), 'backups');
    mkdirSync(backupsDir, { recursive: true });
    return path.join(backupsDir, safeBackupFileName());
  }

  private readBackupPayload(filePath: string, passphrase: string): BackupPayload {
    assertPassphrase(passphrase);
    const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as BackupEnvelope;
    if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION || envelope.algorithm !== 'aes-256-gcm') {
      throw new Error('Die Datei ist kein unterstütztes Gremia.SBV-Backup.');
    }

    const key = deriveBackupKey(passphrase, envelope.salt);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'hex'));
    decipher.setAAD(Buffer.from(`${BACKUP_FORMAT}:${BACKUP_VERSION}`, 'utf8'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
    const compressed = Buffer.concat([decipher.update(Buffer.from(envelope.payload, 'base64')), decipher.final()]);
    const payload = JSON.parse(gunzipSync(compressed).toString('utf8')) as BackupPayload;
    return payload;
  }

  private verifyPayload(payload: BackupPayload): void {
    if (payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION || !Array.isArray(payload.files)) {
      throw new Error('Das Backup-Manifest ist ungültig.');
    }

    const seen = new Set<string>();
    for (const file of payload.files) {
      assertRelativePath(file.relativePath);
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
