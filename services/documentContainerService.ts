import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION = '.gsbvdoc';

export interface EncryptedDocumentContainerWriteInput {
  plain: Buffer;
  storageRoot: string;
  subdirectory: string;
  documentId: string;
  filename: string;
  mimeType: string;
}

export interface EncryptedDocumentContainerReadInput {
  storagePath: string;
  documentKey: string;
  iv: string;
  authTag: string;
  expectedSha256?: string;
}

export interface EncryptedDocumentContainerResult {
  storagePath: string;
  filename: string;
  mimeType: string;
  sha256: string;
  documentKey: string;
  iv: string;
  authTag: string;
  sizeBytes: number;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function safeDocumentFilePart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'sbv-dokument';
}

function assertRelativeSubdirectory(subdirectory: string): string {
  const normalized = subdirectory.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/g, '');
  if (!normalized || normalized.includes('..') || path.isAbsolute(subdirectory)) {
    throw new Error('Ungültiges Dokumentcontainer-Unterverzeichnis.');
  }
  return normalized;
}

function assertSafeDocumentId(documentId: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(documentId)) {
    throw new Error('Ungültige Dokumentcontainer-ID.');
  }
  return documentId;
}

export class DocumentContainerService {
  async writeEncryptedContainer(input: EncryptedDocumentContainerWriteInput): Promise<EncryptedDocumentContainerResult> {
    const documentId = assertSafeDocumentId(input.documentId);
    const subdirectory = assertRelativeSubdirectory(input.subdirectory);
    const storageRoot = path.resolve(input.storageRoot);
    const storageDir = path.resolve(storageRoot, subdirectory);
    if (!storageDir.startsWith(storageRoot + path.sep) && storageDir !== storageRoot) {
      throw new Error('Dokumentcontainer darf nicht außerhalb des Datenspeichers liegen.');
    }

    const documentKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', documentKey, iv);
    const encrypted = Buffer.concat([cipher.update(input.plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const storagePath = path.join(storageDir, `${documentId}${ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION}`);

    await fs.promises.mkdir(storageDir, { recursive: true });
    await fs.promises.writeFile(storagePath, encrypted);

    return {
      storagePath,
      filename: input.filename,
      mimeType: input.mimeType,
      sha256: sha256(input.plain),
      documentKey: documentKey.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      sizeBytes: input.plain.length,
    };
  }

  async readEncryptedContainer(input: EncryptedDocumentContainerReadInput): Promise<Buffer> {
    if (!input.storagePath.endsWith(ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION)) {
      throw new Error('Dokumentcontainer hat keine zulässige .gsbvdoc-Endung.');
    }
    const encrypted = await fs.promises.readFile(input.storagePath);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(input.documentKey, 'base64'),
      Buffer.from(input.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (input.expectedSha256 && sha256(plain) !== input.expectedSha256) {
      throw new Error('Dokumentcontainer-Integritätsprüfung fehlgeschlagen.');
    }
    return plain;
  }
}
