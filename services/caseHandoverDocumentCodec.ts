import fs from 'node:fs';
import { createDecipheriv } from 'node:crypto';
import { resolveEncryptedDocumentStoragePath } from './documentContainerService.js';
import type { Row } from './caseHandoverSupport.js';

function decryptDocumentForHandover(row: Row, dataDir: string): Buffer {
  if (!row.storage_path || !row.document_key || !row.iv || !row.auth_tag) return Buffer.alloc(0);

  const storagePath = resolveEncryptedDocumentStoragePath(dataDir, String(row.storage_path));
  const key = Buffer.from(String(row.document_key), 'base64');
  const iv = Buffer.from(String(row.iv), 'base64');
  const authTag = Buffer.from(String(row.auth_tag), 'base64');
  try {
    if (key.length !== 32 || iv.length !== 12 || authTag.length !== 16) {
      throw new Error('Falldokument enthält ungültige Kryptometadaten.');
    }
    const encrypted = fs.readFileSync(storagePath);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } finally {
    key.fill(0);
    iv.fill(0);
    authTag.fill(0);
  }
}

export function encodeDocumentForHandover(row: Row, dataDir: string): string {
  const plain = decryptDocumentForHandover(row, dataDir);
  try {
    return plain.toString('base64');
  } finally {
    plain.fill(0);
  }
}

export function sanitizeHandoverDocumentMetadata(doc: Row): Row {
  const { storage_path: _storagePath, document_key: _documentKey, iv: _iv, auth_tag: _authTag, ...metadata } = doc;
  return metadata;
}
