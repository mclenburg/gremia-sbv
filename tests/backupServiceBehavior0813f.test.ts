import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { BackupService, CURRENT_BACKUP_SCRYPT_PARAMS, LEGACY_BACKUP_SCRYPT_PARAMS, type BackupFileOperations } from '../services/backupService';
import { atomicWriteFileSync } from '../services/secureFileOperations';

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
    prepare: () => ({ get: () => ({ value: '0044' }) }),
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

function createLegacyBackup(
  filePath: string,
  files: Array<{ relativePath: string; content: string; declaredSha256?: string; declaredSizeBytes?: number; contentBase64?: string }>,
  payloadVersion = 1,
): void {
  const createdAt = '2026-05-07T08:00:00.000Z';
  const payload = {
    format: 'gremia-sbv-encrypted-backup',
    version: payloadVersion,
    appVersion: '0.8.13-test',
    createdAt,
    schemaVersion: '0024',
    files: files.map((file) => {
      const content = Buffer.from(file.content, 'utf8');
      return {
        relativePath: file.relativePath,
        sizeBytes: file.declaredSizeBytes ?? content.length,
        sha256: file.declaredSha256 ?? sha256(content),
        contentBase64: file.contentBase64 ?? content.toString('base64')
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


function writeVaultWithJournalAndViolationSentinel(dataDir: string): void {
  mkdirSync(path.join(dataDir, 'documents', 'generated'), { recursive: true });
  writeMinimalVault(dataDir);
  writeFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), JSON.stringify({
    schemaVersion: '0044',
    tables: [
      'activity_journal_entries',
      'activity_journal_links',
      'sbv_participation_violations',
      'sbv_participation_violation_events',
      'sbv_participation_violation_documents',
      'generated_documents'
    ]
  }));
  writeFileSync(path.join(dataDir, 'documents', 'generated', 'violation.gsbvdoc'), 'encrypted-violation-document');
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


  it('preserves activity journal and participation violation domain payloads during backup and restore', () => {
    const dataDir = tempDir('gremia-sbv-backup-domain-data-');
    const outDir = tempDir('gremia-sbv-backup-domain-out-');
    createdDirs.push(dataDir, outDir);
    writeVaultWithJournalAndViolationSentinel(dataDir);

    const target = path.join(outDir, 'domain.gsbvbackup');
    const service = new BackupService(createSecurityStub(dataDir) as never);
    expect(service.createBackup(target, PASSPHRASE).ok).toBe(true);

    rmSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), { force: true });
    rmSync(path.join(dataDir, 'documents'), { recursive: true, force: true });
    expect(service.restoreBackup(target, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN').ok).toBe(true);

    const restoredVault = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
    for (const tableName of ['activity_journal_entries', 'activity_journal_links', 'sbv_participation_violations', 'sbv_participation_violation_events', 'sbv_participation_violation_documents', 'generated_documents']) {
      expect(restoredVault).toContain(tableName);
    }
    expect(readFileSync(path.join(dataDir, 'documents', 'generated', 'violation.gsbvdoc'), 'utf8')).toBe('encrypted-violation-document');
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
    expect(existsSync(path.join(dataDir, 'documents'))).toBe(true);
    expect(existsSync(path.join(dataDir, 'exports'))).toBe(true);
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

describe('backup manipulation and rollback hardening', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const directory of dirs.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  it('rejects malformed envelopes and abusive KDF parameters before key derivation', () => {
    const dataDir = tempDir('gremia-sbv-backup-envelope-');
    const outDir = tempDir('gremia-sbv-backup-envelope-out-');
    dirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);
    const service = new BackupService(createSecurityStub(dataDir) as never);
    const malformed = path.join(outDir, 'malformed.gsbvbackup');
    writeFileSync(malformed, '{broken');
    expect(service.inspectBackup(malformed, PASSPHRASE).error).toContain('gültiges JSON');

    const valid = path.join(outDir, 'valid.gsbvbackup');
    expect(service.createBackup(valid, PASSPHRASE).ok).toBe(true);
    const envelope = JSON.parse(readFileSync(valid, 'utf8')) as Record<string, unknown>;
    envelope.kdfParams = { N: 1073741824, r: 8, p: 1, maxmem: 2147483648 };
    writeFileSync(valid, JSON.stringify(envelope));
    expect(service.inspectBackup(valid, PASSPHRASE).error).toContain('KDF-Parameter');
  });

  it('rejects duplicate, traversing and incomplete file manifests without changing the current vault', () => {
    const variants = [
      [
        { relativePath: 'gremia-sbv.vault.sqlite', content: 'one' },
        { relativePath: 'gremia-sbv.vault.sqlite', content: 'two' },
        { relativePath: 'security.json', content: '{}' },
        { relativePath: 'vault-manifest.json', content: '{}' },
      ],
      [
        { relativePath: 'gremia-sbv.vault.sqlite', content: 'one' },
        { relativePath: 'security.json', content: '{}' },
        { relativePath: '../vault-manifest.json', content: '{}' },
      ],
      [
        { relativePath: 'gremia-sbv.vault.sqlite', content: 'one' },
        { relativePath: 'security.json', content: '{}' },
      ],
    ];

    for (const [index, files] of variants.entries()) {
      const dataDir = tempDir(`gremia-sbv-backup-reject-${index}-`);
      const outDir = tempDir(`gremia-sbv-backup-reject-out-${index}-`);
      dirs.push(dataDir, outDir);
      writeMinimalVault(dataDir);
      const current = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
      const file = path.join(outDir, `invalid-${index}.gsbvbackup`);
      createLegacyBackup(file, files);
      const service = new BackupService(createSecurityStub(dataDir) as never);
      expect(service.restoreBackup(file, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN').ok).toBe(false);
      expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe(current);
      expect(readdirSync(path.dirname(dataDir)).filter((name) => name.includes('.restore-staging.'))).toEqual([]);
    }
  });
});


describe('backup restore transactional failure completion', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const directory of dirs.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  function defaultOperations(): BackupFileOperations {
    return { atomicWriteFileSync, mkdirSync, renameSync, rmSync, writeFileSync };
  }

  it('keeps the active vault unchanged when writing the staged document fails and cleans staging files', () => {
    const dataDir = tempDir('gremia-sbv-restore-stage-failure-');
    const outDir = tempDir('gremia-sbv-restore-stage-failure-out-');
    dirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);
    const backup = path.join(outDir, 'valid.gsbvbackup');
    const creator = new BackupService(createSecurityStub(dataDir) as never);
    expect(creator.createBackup(backup, PASSPHRASE).ok).toBe(true);
    const before = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
    const base = defaultOperations();
    const operations: BackupFileOperations = {
      ...base,
      writeFileSync: (file, data, options) => {
        if (String(file).includes(`${path.sep}documents${path.sep}`)) throw new Error('injected staged document failure');
        return writeFileSync(file, data, options);
      },
    };
    const result = new BackupService(createSecurityStub(dataDir) as never, operations).restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
    expect(result.ok).toBe(false);
    expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe(before);
    expect(readdirSync(path.dirname(dataDir)).filter((name) => name.includes('.restore-staging.'))).toEqual([]);
  });

  it('restores the complete previous vault when activation of the staged restore fails', () => {
    const dataDir = tempDir('gremia-sbv-restore-rename-failure-');
    const outDir = tempDir('gremia-sbv-restore-rename-failure-out-');
    dirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);
    const backup = path.join(outDir, 'valid.gsbvbackup');
    const creator = new BackupService(createSecurityStub(dataDir) as never);
    expect(creator.createBackup(backup, PASSPHRASE).ok).toBe(true);
    writeFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'current-vault');
    let renames = 0;
    const base = defaultOperations();
    const operations: BackupFileOperations = {
      ...base,
      renameSync: (from, to) => {
        renames += 1;
        if (renames === 2) throw new Error('injected activation failure');
        return renameSync(from, to);
      },
    };
    const service = new BackupService(createSecurityStub(dataDir) as never, operations);
    const failed = service.restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
    expect(failed.ok).toBe(false);
    expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe('current-vault');
    expect(readdirSync(path.dirname(dataDir)).filter((name) => name.includes('.restore-staging.'))).toEqual([]);

    const repeated = creator.restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
    expect(repeated.ok).toBe(true);
    expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe('vault');
  });

  it('rejects manipulated authentication data and truncated encrypted payloads without changing the vault', () => {
    for (const mutation of ['tag', 'payload'] as const) {
      const dataDir = tempDir(`gremia-sbv-backup-${mutation}-`);
      const outDir = tempDir(`gremia-sbv-backup-${mutation}-out-`);
      dirs.push(dataDir, outDir);
      writeMinimalVault(dataDir);
      const backup = path.join(outDir, `${mutation}.gsbvbackup`);
      const service = new BackupService(createSecurityStub(dataDir) as never);
      expect(service.createBackup(backup, PASSPHRASE).ok).toBe(true);
      const envelope = JSON.parse(readFileSync(backup, 'utf8')) as { tag: string; payload: string };
      if (mutation === 'tag') envelope.tag = '00'.repeat(16);
      else envelope.payload = envelope.payload.slice(0, Math.max(1, envelope.payload.length - 24));
      writeFileSync(backup, JSON.stringify(envelope));
      const before = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
      expect(service.restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN').ok).toBe(false);
      expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe(before);
    }
  });

  it('rejects wrong hashes, declared sizes, invalid Base64 and future payload formats before restore', () => {
    const variants: Array<{ name: string; files: Array<{ relativePath: string; content: string; declaredSha256?: string; declaredSizeBytes?: number; contentBase64?: string }>; payloadVersion?: number }> = [
      {
        name: 'wrong-hash',
        files: [
          { relativePath: 'gremia-sbv.vault.sqlite', content: 'vault', declaredSha256: '00'.repeat(32) },
          { relativePath: 'security.json', content: '{}' },
          { relativePath: 'vault-manifest.json', content: '{}' },
        ],
      },
      {
        name: 'wrong-size',
        files: [
          { relativePath: 'gremia-sbv.vault.sqlite', content: 'vault', declaredSizeBytes: 999 },
          { relativePath: 'security.json', content: '{}' },
          { relativePath: 'vault-manifest.json', content: '{}' },
        ],
      },
      {
        name: 'invalid-base64',
        files: [
          { relativePath: 'gremia-sbv.vault.sqlite', content: 'vault', contentBase64: '%%%not-base64%%%' },
          { relativePath: 'security.json', content: '{}' },
          { relativePath: 'vault-manifest.json', content: '{}' },
        ],
      },
      {
        name: 'future-payload',
        payloadVersion: 99,
        files: [
          { relativePath: 'gremia-sbv.vault.sqlite', content: 'vault' },
          { relativePath: 'security.json', content: '{}' },
          { relativePath: 'vault-manifest.json', content: '{}' },
        ],
      },
    ];

    for (const variant of variants) {
      const dataDir = tempDir(`gremia-sbv-backup-${variant.name}-`);
      const outDir = tempDir(`gremia-sbv-backup-${variant.name}-out-`);
      dirs.push(dataDir, outDir);
      writeMinimalVault(dataDir);
      const backup = path.join(outDir, `${variant.name}.gsbvbackup`);
      createLegacyBackup(backup, variant.files, variant.payloadVersion);
      const service = new BackupService(createSecurityStub(dataDir) as never);
      const before = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
      const result = service.restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
      expect(result.ok, variant.name).toBe(false);
      expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8'), variant.name).toBe(before);
    }
  });

  it('keeps the active vault unchanged when writing the staged database fails', () => {
    const dataDir = tempDir('gremia-sbv-restore-db-failure-');
    const outDir = tempDir('gremia-sbv-restore-db-failure-out-');
    dirs.push(dataDir, outDir);
    writeMinimalVault(dataDir);
    const backup = path.join(outDir, 'valid.gsbvbackup');
    const creator = new BackupService(createSecurityStub(dataDir) as never);
    expect(creator.createBackup(backup, PASSPHRASE).ok).toBe(true);
    const base = defaultOperations();
    const operations: BackupFileOperations = {
      ...base,
      writeFileSync: (file, data, options) => {
        if (String(file).endsWith('gremia-sbv.vault.sqlite')) throw new Error('injected staged database failure');
        return writeFileSync(file, data, options);
      },
    };
    const before = readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8');
    const result = new BackupService(createSecurityStub(dataDir) as never, operations).restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN');
    expect(result.ok).toBe(false);
    expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'utf8')).toBe(before);
    expect(readdirSync(path.dirname(dataDir)).filter((name) => name.includes('.restore-staging.'))).toEqual([]);
  });

});
