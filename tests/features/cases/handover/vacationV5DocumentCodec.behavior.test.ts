import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentContainerService } from '../../../../services/documentContainerService';
import { encodeSelectedVacationV5Document, VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES } from '../../../../services/vacationV5DocumentCodec';

describe('Format-5-Dokumentauswahl', () => {
  it('entschlüsselt und prüft nur ein ausdrücklich gewähltes, intaktes Dokument', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-document-'));
    try {
      const plain = Buffer.from('Vertraulicher Inhalt mit Umlaut ä', 'utf8');
      const stored = await new DocumentContainerService().writeEncryptedContainer({ plain, storageRoot: directory,
        subdirectory: 'case-documents', documentId: 'selected', filename: 'Attest.pdf', mimeType: 'application/pdf' });
      const row = { storage_path: stored.storageReference, document_key: stored.documentKey,
        iv: stored.iv, auth_tag: stored.authTag, sha256: stored.sha256, size_bytes: stored.sizeBytes };
      const encoded = encodeSelectedVacationV5Document(row, directory);
      expect(Buffer.from(encoded.contentBase64, 'base64')).toEqual(plain);
      expect(encoded.totalBytes).toBe(plain.length);
      expect(() => encodeSelectedVacationV5Document({ ...row, size_bytes: plain.length + 1 }, directory)).toThrow(/Größe/);
      expect(() => encodeSelectedVacationV5Document({ ...row, size_bytes: 25 * 1024 * 1024 }, directory))
        .toThrow(/Größenlimit/);
      expect(() => encodeSelectedVacationV5Document(row, directory, VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES)).toThrow(/Größenlimit/);
      expect(() => encodeSelectedVacationV5Document({ ...row, document_key: null }, directory)).toThrow(/fehlende Metadaten/);
      fs.rmSync(stored.storagePath);
      expect(() => encodeSelectedVacationV5Document(row, directory)).toThrow();
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
