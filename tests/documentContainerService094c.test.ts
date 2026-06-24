import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentContainerService, safeDocumentFilePart } from '../services/documentContainerService';

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
      expect(result.filename).toBe('test.docx');
      expect(result.sizeBytes).toBe(plain.length);
      expect(readFileSync(result.storagePath).subarray(0, 2).toString()).not.toBe('PK');

      await expect(service.readEncryptedContainer({
        storagePath: result.storagePath,
        documentKey: result.documentKey,
        iv: result.iv,
        authTag: result.authTag,
        expectedSha256: result.sha256,
      })).resolves.toEqual(plain);
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
        storagePath: result.storagePath,
        documentKey: result.documentKey,
        iv: result.iv,
        authTag: result.authTag,
        expectedSha256: '0'.repeat(64),
      })).rejects.toThrow(/Integritätsprüfung/);

      await expect(service.readEncryptedContainer({
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

  it('normalisiert Dateinamensbestandteile ohne medizinische oder technische Sonderzeichenlogik in Fachservices zu duplizieren', () => {
    expect(safeDocumentFilePart('SBV-Anhörung: Maßnahme / Person #1')).toBe('SBV-Anho_rung_Ma_nahme_Person_1');
    expect(safeDocumentFilePart('***')).toBe('sbv-dokument');
  });
});
