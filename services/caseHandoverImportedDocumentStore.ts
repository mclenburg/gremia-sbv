import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, randomBytes } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { sha256, type Row } from './caseHandoverSupport.js';
import {
  OWNER_ONLY_DIRECTORY_MODE,
  OWNER_ONLY_FILE_MODE,
  restrictDirectoryToOwnerSync,
  restrictFileToOwnerSync,
} from './secureFilePermissions.js';
import type { TrackImportedFile } from './caseHandoverImportUnitOfWork.js';

export interface StoreImportedDocumentInput {
  id: string;
  caseId: string;
  measureId?: string | null;
  data: Partial<Row>;
  contentBase64: string;
  timestamp: string;
  dataDirectory: string;
  titlePrefix: string;
  trackFile?: TrackImportedFile;
}

export function storeImportedCaseDocument(
  database: DatabaseAdapter,
  input: StoreImportedDocumentInput,
): void {
  const plain = Buffer.from(input.contentBase64, 'base64');
  const documentKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', documentKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  try {
    const storageDir = path.join(input.dataDirectory, 'documents', input.caseId);
    fs.mkdirSync(storageDir, { recursive: true, mode: OWNER_ONLY_DIRECTORY_MODE });
    restrictDirectoryToOwnerSync(storageDir);
    const storagePath = path.join(storageDir, `${input.id}.gsbvdoc`);
    input.trackFile?.(storagePath);
    fs.writeFileSync(storagePath, encrypted, { mode: OWNER_ONLY_FILE_MODE });
    restrictFileToOwnerSync(storagePath);
    database.prepare(`
      INSERT INTO case_documents (
        id, case_id, measure_id, filename, display_title, mime_type, storage_path, sha256,
        extracted_text, document_key, iv, auth_tag, size_bytes, imported_at, extraction_quality,
        text_extraction_status, text_extracted_at, text_extractor_id, text_extraction_error,
        ocr_status, ocr_text, contains_health_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id, input.caseId, input.measureId ?? null,
      input.data.filename ?? 'uebergabe-dokument.bin',
      `${input.titlePrefix}${input.data.display_title ?? input.data.filename ?? 'Übergabe-Dokument'}`,
      input.data.mime_type ?? null, storagePath, sha256(plain), input.data.extracted_text ?? null,
      documentKey.toString('base64'), iv.toString('base64'), tag.toString('base64'), plain.length,
      input.timestamp, input.data.extraction_quality ?? 'unknown', input.data.text_extraction_status ?? 'unknown',
      input.data.text_extracted_at ?? null, input.data.text_extractor_id ?? null,
      input.data.text_extraction_error ?? null, input.data.ocr_status ?? 'not_required',
      input.data.ocr_text ?? null, input.data.contains_health_data ?? 1, input.timestamp,
    );
  } finally {
    plain.fill(0);
    documentKey.fill(0);
    iv.fill(0);
    tag.fill(0);
  }
}
