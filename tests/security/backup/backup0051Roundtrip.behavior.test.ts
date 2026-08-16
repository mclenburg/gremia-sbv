import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BackupService } from '../../../services/backupService';

const PASSPHRASE = 'Wahlakte-und-Amtsarbeit-Backup-2026!';

describe('backup roundtrip for schema 0051 vault contents', () => {
  it('restores the complete opaque vault and office document containers byte-for-byte', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gremia-0051-backup-'));
    const dataDir = path.join(root, 'data');
    mkdirSync(path.join(dataDir, 'documents', 'office', 'election'), { recursive: true });
    mkdirSync(path.join(dataDir, 'backups'), { recursive: true });
    mkdirSync(path.join(dataDir, 'tmp'), { recursive: true });
    const vaultBytes = Buffer.from('encrypted-sqlcipher-vault-schema-0051-with-election-tables');
    const documentBytes = Buffer.from([0, 1, 2, 3, 250, 251, 252]);
    writeFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), vaultBytes);
    writeFileSync(path.join(dataDir, 'security.json'), '{"version":4}');
    writeFileSync(path.join(dataDir, 'vault-manifest.json'), '{"version":3}');
    writeFileSync(path.join(dataDir, 'documents', 'office', 'election', 'archive.gsbvdoc'), documentBytes);
    const db = { prepare: () => ({ get: () => ({ value: '0051' }) }), pragma: () => undefined };
    const security = { getDataDirectory: () => dataDir, getActiveDatabase: () => db, lock: () => undefined };
    const backup = path.join(root, 'archive.gsbvbackup');
    const service = new BackupService(security as never);
    try {
      expect(service.createBackup(backup, PASSPHRASE).ok).toBe(true);
      writeFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'), 'changed');
      rmSync(path.join(dataDir, 'documents'), { recursive: true, force: true });
      expect(service.restoreBackup(backup, PASSPHRASE, 'BACKUP WIEDERHERSTELLEN').ok).toBe(true);
      expect(readFileSync(path.join(dataDir, 'gremia-sbv.vault.sqlite'))).toEqual(vaultBytes);
      expect(readFileSync(path.join(dataDir, 'documents', 'office', 'election', 'archive.gsbvdoc'))).toEqual(documentBytes);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
