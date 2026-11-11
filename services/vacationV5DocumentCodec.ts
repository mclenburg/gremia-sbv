import fs from 'node:fs';
import { decryptEncryptedDocumentBytes, resolveEncryptedDocumentStoragePath } from './documentContainerService.js';

export const VACATION_V5_MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;
export const VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES = 180 * 1024 * 1024;

export function encodeSelectedVacationV5Document(row: Record<string, unknown>, storageRoot: string,
  previousBytes = 0): { contentBase64: string; contentSha256: string; sizeBytes: number; totalBytes: number } {
  const sizeBytes = row.size_bytes;
  if (typeof row.storage_path !== 'string' || !row.storage_path
    || typeof row.document_key !== 'string' || !row.document_key
    || typeof row.iv !== 'string' || !row.iv || typeof row.auth_tag !== 'string' || !row.auth_tag
    || typeof row.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.sha256)
    || !Number.isSafeInteger(sizeBytes) || Number(sizeBytes) < 0 || Number(sizeBytes) > VACATION_V5_MAX_DOCUMENT_BYTES
    || !Number.isSafeInteger(previousBytes) || previousBytes < 0
    || previousBytes + Number(sizeBytes) > VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES) {
    throw new Error('Ausgewähltes Dokument hat fehlende Metadaten oder überschreitet das Größenlimit.');
  }
  const storagePath = resolveEncryptedDocumentStoragePath(storageRoot, row.storage_path);
  const stats = fs.statSync(storagePath);
  if (!stats.isFile() || stats.size > VACATION_V5_MAX_DOCUMENT_BYTES + 1024) {
    throw new Error('Ausgewählter Dokumentcontainer ist ungültig oder zu groß.');
  }
  const plain = decryptEncryptedDocumentBytes({ storageRoot, storagePath,
    documentKey: row.document_key, iv: row.iv, authTag: row.auth_tag,
    expectedSha256: row.sha256 }, fs.readFileSync(storagePath));
  try {
    if (plain.length !== sizeBytes || plain.length > VACATION_V5_MAX_DOCUMENT_BYTES
      || previousBytes + plain.length > VACATION_V5_MAX_DOCUMENT_TOTAL_BYTES) {
      throw new Error('Ausgewähltes Dokument stimmt nicht mit der gespeicherten Größe überein.');
    }
    return { contentBase64: plain.toString('base64'), contentSha256: row.sha256,
      sizeBytes: plain.length, totalBytes: previousBytes + plain.length };
  } finally { plain.fill(0); }
}
