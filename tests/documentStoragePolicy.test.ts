import { describe, expect, it } from 'vitest';
import {
  buildDocumentStorageFindings,
  isEncryptedDocumentContainer,
  isLikelyCleartextDocument,
  isPathInsideDirectory,
  shouldIncludePathInBackup
} from '../services/documentStoragePolicy';

describe('document storage policy', () => {
  it('treats only .gsbvdoc files as encrypted document containers', () => {
    expect(isEncryptedDocumentContainer('documents/c1/d1.gsbvdoc')).toBe(true);
    expect(isEncryptedDocumentContainer('documents/c1/d1.pdf')).toBe(false);
  });

  it('detects cleartext documents in protected storage', () => {
    expect(isLikelyCleartextDocument('documents/c1/anschreiben.pdf')).toBe(true);
    expect(isLikelyCleartextDocument('documents/c1/anschreiben.pdf.gsbvdoc')).toBe(false);
  });

  it('excludes temporary files and nested backups from backup payloads', () => {
    expect(shouldIncludePathInBackup('gremia-sbv.vault.sqlite')).toBe(true);
    expect(shouldIncludePathInBackup('documents/c1/d1.gsbvdoc')).toBe(true);
    expect(shouldIncludePathInBackup('tmp/document-preview/d1.pdf')).toBe(false);
    expect(shouldIncludePathInBackup('backups/old.gsbvbackup')).toBe(false);
    expect(shouldIncludePathInBackup('../escape.sqlite')).toBe(false);
  });

  it('guards against path traversal', () => {
    expect(isPathInsideDirectory('/safe/root/documents/file.gsbvdoc', '/safe/root')).toBe(true);
    expect(isPathInsideDirectory('/safe/root/../secrets/file.pdf', '/safe/root')).toBe(false);
  });

  it('creates findings for cleartext, orphan and missing containers', () => {
    const findings = buildDocumentStorageFindings({
      documentRoot: '/safe/data/documents',
      knownContainerPaths: ['c1/known.gsbvdoc'],
      filesOnDisk: ['c1/known.gsbvdoc', 'c1/orphan.gsbvdoc', 'c1/klartext.pdf'],
      missingContainerPaths: ['c2/missing.gsbvdoc']
    });

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'orphan_container', path: 'c1/orphan.gsbvdoc' }),
      expect.objectContaining({ type: 'cleartext_file', path: 'c1/klartext.pdf', riskLevel: 'critical' }),
      expect.objectContaining({ type: 'missing_container', path: 'c2/missing.gsbvdoc', riskLevel: 'critical' })
    ]));
  });
});
