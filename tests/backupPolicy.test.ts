import { describe, expect, it } from 'vitest';
import { backupSha256, isSafeBackupRelativePath, validateBackupManifestFiles } from '../services/backupPolicy';

const hash = backupSha256('test');

describe('backup policy', () => {
  it('accepts productive vault and security files', () => {
    expect(isSafeBackupRelativePath('gremia-sbv.vault.sqlite')).toBe(true);
    expect(isSafeBackupRelativePath('security.json')).toBe(true);
    expect(isSafeBackupRelativePath('documents/c1/d1.gsbvdoc')).toBe(true);
  });

  it('rejects temporary data, nested backups and path traversal', () => {
    expect(isSafeBackupRelativePath('tmp/document-preview/report.pdf')).toBe(false);
    expect(isSafeBackupRelativePath('backups/older.gsbvbackup')).toBe(false);
    expect(isSafeBackupRelativePath('../security.json')).toBe(false);
    expect(isSafeBackupRelativePath('/etc/passwd')).toBe(false);
  });

  it('requires vault, security and manifest files', () => {
    const result = validateBackupManifestFiles([
      { relativePath: 'gremia-sbv.vault.sqlite', sizeBytes: 4, sha256: hash },
      { relativePath: 'security.json', sizeBytes: 4, sha256: hash }
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Pflichtdatei fehlt im Backup: vault-manifest.json');
  });

  it('detects duplicate and unsafe manifest entries', () => {
    const result = validateBackupManifestFiles([
      { relativePath: 'gremia-sbv.vault.sqlite', sizeBytes: 4, sha256: hash },
      { relativePath: 'security.json', sizeBytes: 4, sha256: hash },
      { relativePath: 'vault-manifest.json', sizeBytes: 4, sha256: hash },
      { relativePath: 'security.json', sizeBytes: 4, sha256: hash },
      { relativePath: '../escape.txt', sizeBytes: 4, sha256: hash }
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('Doppelter Dateieintrag'))).toBe(true);
    expect(result.errors.some((error) => error.includes('Unsicherer'))).toBe(true);
  });

  it('accepts a minimal consistent backup manifest', () => {
    const result = validateBackupManifestFiles([
      { relativePath: 'gremia-sbv.vault.sqlite', sizeBytes: 4, sha256: hash },
      { relativePath: 'security.json', sizeBytes: 4, sha256: hash },
      { relativePath: 'vault-manifest.json', sizeBytes: 4, sha256: hash },
      { relativePath: 'documents/c1/d1.gsbvdoc', sizeBytes: 4, sha256: hash }
    ]);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
