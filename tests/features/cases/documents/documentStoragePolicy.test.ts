import { describe, expect, it } from 'vitest';
import { shouldIncludePathInBackup } from '../../../../services/documentStoragePolicy';

describe('document storage policy', () => {
  it('excludes temporary files and nested backups from backup payloads', () => {
    expect(shouldIncludePathInBackup('gremia-sbv.vault.sqlite')).toBe(true);
    expect(shouldIncludePathInBackup('documents/c1/d1.gsbvdoc')).toBe(true);
    expect(shouldIncludePathInBackup('tmp/document-preview/d1.pdf')).toBe(false);
    expect(shouldIncludePathInBackup('backups/old.gsbvbackup')).toBe(false);
    expect(shouldIncludePathInBackup('../escape.sqlite')).toBe(false);
  });
});
