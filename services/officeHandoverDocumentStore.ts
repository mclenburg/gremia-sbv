import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { sha256, type Row } from './caseHandoverSupport.js';
import {
  OWNER_ONLY_DIRECTORY_MODE,
  OWNER_ONLY_FILE_MODE,
  restrictDirectoryToOwnerSync,
  restrictFileToOwnerSync,
} from './secureFilePermissions.js';
import type { TrackImportedFile } from './caseHandoverImportUnitOfWork.js';

export function storeImportedElectionDocument(
  database: DatabaseAdapter,
  dataDirectory: string,
  electionId: string,
  data: Row,
  contentBase64: string,
  timestamp: string,
  trackFile?: TrackImportedFile,
): string {
  const plain = Buffer.from(contentBase64, 'base64');
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const documentId = randomUUID();
  const linkId = randomUUID();
  let tag: Buffer | undefined;
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    tag = cipher.getAuthTag();
    const storageDirectory = path.join(dataDirectory, 'office', 'election');
    fs.mkdirSync(storageDirectory, { recursive: true, mode: OWNER_ONLY_DIRECTORY_MODE });
    restrictDirectoryToOwnerSync(storageDirectory);
    const storagePath = path.join(storageDirectory, `${documentId}.gsbvdoc`);
    trackFile?.(storagePath);
    fs.writeFileSync(storagePath, encrypted, { mode: OWNER_ONLY_FILE_MODE });
    restrictFileToOwnerSync(storagePath);
    database.prepare(`
      INSERT INTO generated_documents (
        id, case_id, template_id, violation_id, document_kind, template_version, title,
        storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at
      ) VALUES (?, NULL, NULL, NULL, 'generic', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId,
      data.link_template_version ?? data.template_version ?? null,
      data.title ?? 'Wahldokument aus Amtsübergabe',
      storagePath,
      data.filename ?? 'wahldokument.pdf',
      data.mime_type ?? 'application/pdf',
      sha256(plain),
      key.toString('base64'),
      iv.toString('base64'),
      tag.toString('base64'),
      plain.length,
      timestamp,
    );
    database.prepare(`
      INSERT INTO sbv_workflow_document_links (
        id, owner_type, owner_id, document_id, purpose, document_class,
        template_version, legal_rule_version, created_at
      ) VALUES (?, 'election', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      linkId,
      electionId,
      documentId,
      data.purpose ?? 'Wahlakte',
      data.document_class ?? 'generated_document',
      data.link_template_version ?? data.template_version ?? null,
      data.legal_rule_version ?? null,
      timestamp,
    );
    return documentId;
  } finally {
    plain.fill(0);
    key.fill(0);
    iv.fill(0);
    tag?.fill(0);
  }
}
