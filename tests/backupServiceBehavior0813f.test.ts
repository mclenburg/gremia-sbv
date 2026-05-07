import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { BackupService, CURRENT_BACKUP_SCRYPT_PARAMS, LEGACY_BACKUP_SCRYPT_PARAMS } from '../services/backupService';

const PASSPHRASE = 'SehrSichereBackupPassphrase!2026';

type DbStub = {
  prepare: (sql: string) => { get: () => { value: string } | undefined };
  pragma: () => void;
};

function tempDir(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function createSecurityStub(dataDir: string) {
  const db: DbStub = {
    prepare: () => ({ get: () => ({ value: '0024' }) }),
    pragma: () => undefined
  };
  return {
    getDataDirectory: () => dataDir,
    getActiveDatabase: () => db,
    lock: () => undefined
  };
}

function writeMinimalVault(dataDir: string): void {
  mkdirSync(path.join(dataDir, 'documents'), { recursive: true });
  mkdirSync(path.join(dataDir, 'tmp'), { recursive: true });
  mkdirSync(path.join(dataDir, 'backups'), { recursive: true });
  writeFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'vault');
  writeFileSync(path.join(dataDir, 'security.json'), '{"version":4}');
  writeFileSync(path.join(dataDir, 'vault-manifest.json'), '{"version":3}');
  writeFileSync(path.join(dataDir, 'documents', 'case-1.gsbvdoc'), 'document');
  writeFileSync(path.join(dataDir, 'tmp', 'must-not-be-backed-up.txt'), 'cleartext');
  writeFileSync(path.join(dataDir, 'backups', 'nested.gsbvbackup'), 'nested');
}

function createLegacyBackup(filePath: string, files: Array<{ relativePath: string; content: string }>): void {
  const createdAt = '2026-05-07T08:00:00.000Z';
  const payload = {
    format: 'gremia-sbv-encrypted-backup',
    version: 1,
    appVersion: '0.8.13-test',
    createdAt,
    schemaVersion: '0024',
    files: files.map((file) => {
      const content = Buffer.from(file.content, 'utf8');
      return {
        relativePath: file.relativePath,
        sizeBytes: content.length,
        sha256: sha256(content),
        contentBase64: content.toString('base64')
      };
    })
  };
  const salt = randomBytes(16).toString('hex');
  const iv = randomBytes(12);
  const key = scryptSync(`gremia-sbv-backup-v1:${PASSPHRASE}`, Buffer.from(salt, 'hex'), 32, LEGACY_BACKUP_SCRYPT_PARAMS);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('gremia-sbv-encrypted-backup:1', 'utf8'));
  const encrypted = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'))), cipher.final()]);
  const envelope = {
    format: 'gremia-sbv-encrypted-backup',
    version: 1,
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    compression: 'gzip',
    createdAt,
    appVersion: '0.8.13-test',
    salt,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    payload: encrypted.toString('base64')
  };
  writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`);
}

describe('backup service behavior', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const directory of createdDirs.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('creates encrypted backups with current scrypt parameters and excludes tmp/nested backup files', () => {
    const dataDir = tempDir('gremia-sbv-backup-data-');
    const outDir = tempDir('gremia-sbv-backup-out-');
    createdDirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);

    const target = path.join(outDir, 'current.gsbvbackup');
    const result = new BackupService(createSecurityStub(dataDir) as never).createBackup(target, PASSPHRASE);
    const envelope = JSON.parse(readFileSync(target, 'utf8'));

    expect(result.ok).toBe(true);
    expect(envelope.kdfParams).toEqual(CURRENT_BACKUP_SCRYPT_PARAMS);
    const inspected = new BackupService(createSecurityStub(dataDir) as never).inspectBackup(target, PASSPHRASE);
    expect(inspected.ok).toBe(true);
    expect(inspected.files?.map((file) => file.relativePath)).toEqual(expect.arrayContaining([
      'gremia-sbv.vault.sqlite',
      'security.json',
      'vault-manifest.json',
      'documents/case-1.gsbvdoc'
    ]));
    expect(inspected.files?.some((file) => file.relativePath.startsWith('tmp/'))).toBe(false);
    expect(inspected.files?.some((file) => file.relativePath.startsWith('backups/'))).toBe(false);
  });

  it('restores legacy backups that do not contain explicit kdfParams', () => {
    const dataDir = tempDir('gremia-sbv-restore-data-');
    const outDir = tempDir('gremia-sbv-restore-out-');
    createdDirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);
    const legacyFile = path.join(outDir, 'legacy.gsbvbackup');
    createLegacyBackup(legacyFile, [
      { relativePath: 'gremia-sbv.vault.sqlite', content: 'legacy-vault' },
      { relativePath: 'security.json', content: '{"version":3}' },
      { relativePath: 'vault-manifest.json', content: '{"version":2}' }
    ]);

    const service = new BackupService(createSecurityStub(dataDir) as never);
    const inspected = service.inspectBackup(legacyFile, PASSPHRASE);
    expect(inspected.ok).toBe(true);
    expect(inspected.fileCount).toBe(3);

    const restored = service.restoreBackup(legacyFile, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
    expect(restored.ok).toBe(true);
    expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe('legacy-vault');
    expect(existsSync(path.join(dataDir, 'tmp'))).toBe(true);
    expect(existsSync(path.join(dataDir, 'backups'))).toBe(true);
  });

  it('rejects restore with wrong confirmation or too short passphrase', () => {
    const dataDir = tempDir('gremia-sbv-restore-negative-');
    const outDir = tempDir('gremia-sbv-restore-negative-out-');
    createdDirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);
    const legacyFile = path.join(outDir, 'legacy.gsbvbackup');
    createLegacyBackup(legacyFile, [
      { relativePath: 'gremia-sbv.vault.sqlite', content: 'legacy-vault' },
      { relativePath: 'security.json', content: '{"version":3}' },
      { relativePath: 'vault-manifest.json', content: '{"version":2}' }
    ]);

    const service = new BackupService(createSecurityStub(dataDir) as never);
    expect(service.restoreBackup(legacyFile, PASSPHRASE, 'ja').ok).toBe(false);
    expect(service.inspectBackup(legacyFile, 'kurz').ok).toBe(false);
  });
});
