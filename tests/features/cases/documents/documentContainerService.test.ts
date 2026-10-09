import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentContainerService, safeDocumentFilePart } from '../../../../services/documentContainerService';

describe('DocumentContainerService 0.9.4-c-r6', () => {
  it('verschlüsselt Dokumentbytes zentral als .gsbvdoc und entschlüsselt sie mit Integritätsprüfung', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-container-'));
    try {
      const service = new DocumentContainerService();
      const plain = Buffer.from('PK\u0003\u0004 simulierte DOCX-Nutzdaten');

      const result = await service.writeEncryptedContainer({
        plain,
        storageRoot: dir,
        subdirectory: 'generated-documents/sbv-participation-violations',
        documentId: 'doc-1',
        filename: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      expect(result.storagePath).toBe(path.join(dir, 'generated-documents', 'sbv-participation-violations', 'doc-1.gsbvdoc'));
      expect(result.storageReference).toBe('generated-documents/sbv-participation-violations/doc-1.gsbvdoc');
      expect(result.filename).toBe('test.docx');
      expect(result.sizeBytes).toBe(plain.length);
      expect(readFileSync(result.storagePath).subarray(0, 2).toString()).not.toBe('PK');

      await expect(service.readEncryptedContainer({
        storageRoot: dir,
        storagePath: result.storagePath,
        documentKey: result.documentKey,
        iv: result.iv,
        authTag: result.authTag,
        expectedSha256: result.sha256,
      })).resolves.toEqual(plain);

      const relocatedRoot = mkdtempSync(path.join(tmpdir(), 'gremia-doc-relocated-'));
      try {
        const relocatedPath = path.join(relocatedRoot, result.storageReference);
        mkdirSync(path.dirname(relocatedPath), { recursive: true });
        copyFileSync(result.storagePath, relocatedPath);
        await expect(service.readEncryptedContainer({
          storageRoot: relocatedRoot,
          storagePath: result.storageReference,
          documentKey: result.documentKey,
          iv: result.iv,
          authTag: result.authTag,
          expectedSha256: result.sha256,
        })).resolves.toEqual(plain);
      } finally {
        rmSync(relocatedRoot, { recursive: true, force: true });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('verhindert Pfadausbruch und unsichere Container-IDs vor dem Schreiben', async () => {
    const service = new DocumentContainerService();
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-container-'));
    try {
      await expect(service.writeEncryptedContainer({
        plain: Buffer.from('test'),
        storageRoot: dir,
        subdirectory: '../outside',
        documentId: 'doc-1',
        filename: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })).rejects.toThrow(/Unterverzeichnis|außerhalb/);

      await expect(service.writeEncryptedContainer({
        plain: Buffer.from('test'),
        storageRoot: dir,
        subdirectory: 'generated-documents',
        documentId: '../doc-1',
        filename: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })).rejects.toThrow(/Dokumentcontainer-ID/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('verweigert symbolische Ausbrüche und schreibt Container nur mit Besitzerrechten', async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-vault-'));
    const outsideDir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-outside-'));
    try {
      symlinkSync(outsideDir, path.join(vaultDir, 'linked'));
      const service = new DocumentContainerService();
      await expect(service.writeEncryptedContainer({
        plain: Buffer.from('geheim'), storageRoot: vaultDir, subdirectory: 'linked',
        documentId: 'doc', filename: 'doc.pdf', mimeType: 'application/pdf',
      })).rejects.toThrow(/außerhalb|symbolisch/);

      const result = await service.writeEncryptedContainer({
        plain: Buffer.from('geheim'), storageRoot: vaultDir, subdirectory: 'documents',
        documentId: 'doc', filename: 'doc.pdf', mimeType: 'application/pdf',
      });
      if (process.platform !== 'win32') expect(statSync(result.storagePath).mode & 0o777).toBe(0o600);
      mkdirSync(path.join(vaultDir, 'other'));
      const movedPath = path.join(vaultDir, 'other', 'doc.gsbvdoc');
      copyFileSync(result.storagePath, movedPath);
      await expect(service.readEncryptedContainer({
        storageRoot: vaultDir, storagePath: movedPath,
        documentKey: result.documentKey, iv: result.iv, authTag: result.authTag,
      })).rejects.toThrow();
      symlinkSync(result.storagePath, path.join(outsideDir, 'link.gsbvdoc'));
      await expect(service.readEncryptedContainer({
        storageRoot: outsideDir, storagePath: path.join(outsideDir, 'link.gsbvdoc'),
        documentKey: result.documentKey, iv: result.iv, authTag: result.authTag,
      })).rejects.toThrow(/symbolisch|außerhalb/i);
    } finally {
      rmSync(vaultDir, { recursive: true, force: true });
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });


  it('erkennt Integritätsfehler und falsche Container-Endungen beim Lesen', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-container-'));
    try {
      const service = new DocumentContainerService();
      const result = await service.writeEncryptedContainer({
        plain: Buffer.from('PK\u0003\u0004 unveränderte DOCX-Nutzdaten'),
        storageRoot: dir,
        subdirectory: 'generated-documents',
        documentId: 'doc-integrity',
        filename: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await expect(service.readEncryptedContainer({
        storageRoot: dir,
        storagePath: result.storagePath,
        documentKey: result.documentKey,
        iv: result.iv,
        authTag: result.authTag,
        expectedSha256: '0'.repeat(64),
      })).rejects.toThrow(/Integritätsprüfung/);

      await expect(service.readEncryptedContainer({
        storageRoot: dir,
        storagePath: result.storagePath.replace(/\.gsbvdoc$/, '.docx'),
        documentKey: result.documentKey,
        iv: result.iv,
        authTag: result.authTag,
        expectedSha256: result.sha256,
      })).rejects.toThrow(/\.gsbvdoc/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('verweigert Entschlüsselung außerhalb des angegebenen Tresorpfads und lehnt ungültige Kryptometadaten früh ab', async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-vault-'));
    const outsideDir = mkdtempSync(path.join(tmpdir(), 'gremia-doc-outside-'));
    try {
      const service = new DocumentContainerService();
      const outside = await service.writeEncryptedContainer({
        plain: Buffer.from('vertrauliche Nutzdaten'),
        storageRoot: outsideDir,
        subdirectory: 'documents',
        documentId: 'outside-doc',
        filename: 'outside.pdf',
        mimeType: 'application/pdf',
      });

      await expect(service.readEncryptedContainer({
        storageRoot: vaultDir,
        storagePath: outside.storagePath,
        documentKey: outside.documentKey,
        iv: outside.iv,
        authTag: outside.authTag,
        expectedSha256: outside.sha256,
      })).rejects.toThrow(/außerhalb des Datenspeichers/);

      await expect(service.readEncryptedContainer({
        storageRoot: outsideDir,
        storagePath: outside.storagePath,
        documentKey: Buffer.alloc(16).toString('base64'),
        iv: outside.iv,
        authTag: outside.authTag,
      })).rejects.toThrow(/ungültige Kryptometadaten/);
    } finally {
      rmSync(vaultDir, { recursive: true, force: true });
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('normalisiert Dateinamensbestandteile ohne medizinische oder technische Sonderzeichenlogik in Fachservices zu duplizieren', () => {
    expect(safeDocumentFilePart('SBV-Anhörung: Maßnahme / Person #1')).toBe('SBV-Anho_rung_Ma_nahme_Person_1');
    expect(safeDocumentFilePart('***')).toBe('sbv-dokument');
  });
});
