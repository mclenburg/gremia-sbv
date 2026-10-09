import fs from 'node:fs';
import { decryptEncryptedDocumentBytes, resolveEncryptedDocumentStoragePath } from './documentContainerService.js';
import type { Row } from './caseHandoverSupport.js';

function decryptDocumentForHandover(row: Row, dataDir: string): Buffer {
  if (!row.storage_path || !row.document_key || !row.iv || !row.auth_tag) return Buffer.alloc(0);

  const storagePath = resolveEncryptedDocumentStoragePath(dataDir, String(row.storage_path));
  return decryptEncryptedDocumentBytes({
    storageRoot: dataDir,
    storagePath,
    documentKey: String(row.document_key),
    iv: String(row.iv),
    authTag: String(row.auth_tag),
    expectedSha256: row.sha256 ? String(row.sha256) : undefined,
  }, fs.readFileSync(storagePath));
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
