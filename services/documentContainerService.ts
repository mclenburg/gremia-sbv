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
  storageRoot: string;
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


export function resolveEncryptedDocumentStoragePath(storageRoot: string, storagePath: string): string {
  const root = path.resolve(storageRoot);
  const resolved = path.resolve(storagePath);
  if (!resolved.endsWith(ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION)) {
    throw new Error('Dokumentcontainer hat keine zulässige .gsbvdoc-Endung.');
  }
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Dokumentcontainer darf nicht außerhalb des Datenspeichers liegen.');
  }
  return resolved;
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
    let authTag: Buffer | undefined;
    try {
      const cipher = createCipheriv('aes-256-gcm', documentKey, iv);
      const encrypted = Buffer.concat([cipher.update(input.plain), cipher.final()]);
      authTag = cipher.getAuthTag();
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
    } finally {
      documentKey.fill(0);
      iv.fill(0);
      authTag?.fill(0);
    }
  }

  async readEncryptedContainer(input: EncryptedDocumentContainerReadInput): Promise<Buffer> {
    const storagePath = resolveEncryptedDocumentStoragePath(input.storageRoot, input.storagePath);

    const documentKey = Buffer.from(input.documentKey, 'base64');
    const iv = Buffer.from(input.iv, 'base64');
    const authTag = Buffer.from(input.authTag, 'base64');
    try {
      if (documentKey.length !== 32 || iv.length !== 12 || authTag.length !== 16) {
        throw new Error('Dokumentcontainer enthält ungültige Kryptometadaten.');
      }
      const encrypted = await fs.promises.readFile(storagePath);
      const decipher = createDecipheriv('aes-256-gcm', documentKey, iv);
      decipher.setAuthTag(authTag);
      const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      if (input.expectedSha256 && sha256(plain) !== input.expectedSha256) {
        plain.fill(0);
        throw new Error('Dokumentcontainer-Integritätsprüfung fehlgeschlagen.');
      }
      return plain;
    } finally {
      documentKey.fill(0);
      iv.fill(0);
      authTag.fill(0);
    }
  }
}
