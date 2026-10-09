import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { atomicWriteFileSync } from './secureFileOperations.js';

export const ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION = '.gsbvdoc';
const DOCUMENT_CONTAINER_V2_HEADER = Buffer.from('GSBVDOC2');

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
  storageReference: string;
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
  const resolved = path.isAbsolute(storagePath) ? path.resolve(storagePath) : path.resolve(root, storagePath);
  if (!resolved.endsWith(ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION)) {
    throw new Error('Dokumentcontainer hat keine zulässige .gsbvdoc-Endung.');
  }
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Dokumentcontainer darf nicht außerhalb des Datenspeichers liegen.');
  }
  const realRoot = fs.realpathSync(root);
  const realParent = fs.realpathSync(path.dirname(resolved));
  const realRelative = path.relative(realRoot, realParent);
  if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error('Dokumentcontainer darf nicht über einen symbolischen Pfad außerhalb des Datenspeichers liegen.');
  }
  try {
    if (fs.lstatSync(resolved).isSymbolicLink()) {
      throw new Error('Symbolische Dokumentcontainer sind nicht zulässig.');
    }
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  return resolved;
}

function containerAad(storageRoot: string, storagePath: string): Buffer {
  const relative = path.relative(path.resolve(storageRoot), storagePath).split(path.sep).join('/');
  return Buffer.from(`gremia-sbv-document-v2:${relative}`, 'utf8');
}

export function decryptEncryptedDocumentBytes(
  input: EncryptedDocumentContainerReadInput,
  encryptedContainer: Buffer,
): Buffer {
  const storagePath = resolveEncryptedDocumentStoragePath(input.storageRoot, input.storagePath);
  const documentKey = Buffer.from(input.documentKey, 'base64');
  const iv = Buffer.from(input.iv, 'base64');
  const authTag = Buffer.from(input.authTag, 'base64');
  try {
    if (documentKey.length !== 32 || iv.length !== 12 || authTag.length !== 16) {
      throw new Error('Dokumentcontainer enthält ungültige Kryptometadaten.');
    }
    const version2 = encryptedContainer.subarray(0, DOCUMENT_CONTAINER_V2_HEADER.length).equals(DOCUMENT_CONTAINER_V2_HEADER);
    const encrypted = version2 ? encryptedContainer.subarray(DOCUMENT_CONTAINER_V2_HEADER.length) : encryptedContainer;
    const decipher = createDecipheriv('aes-256-gcm', documentKey, iv);
    if (version2) decipher.setAAD(containerAad(input.storageRoot, storagePath));
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
      await fs.promises.mkdir(storageDir, { recursive: true, mode: 0o700 });
      const storagePath = resolveEncryptedDocumentStoragePath(storageRoot, path.join(storageDir, `${documentId}${ENCRYPTED_DOCUMENT_CONTAINER_EXTENSION}`));
      const cipher = createCipheriv('aes-256-gcm', documentKey, iv);
      cipher.setAAD(containerAad(storageRoot, storagePath));
      const encrypted = Buffer.concat([cipher.update(input.plain), cipher.final()]);
      authTag = cipher.getAuthTag();
      atomicWriteFileSync(storagePath, Buffer.concat([DOCUMENT_CONTAINER_V2_HEADER, encrypted]));

      return {
        storagePath,
        storageReference: path.relative(storageRoot, storagePath).split(path.sep).join('/'),
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
    return decryptEncryptedDocumentBytes(input, await fs.promises.readFile(storagePath));
  }
}
