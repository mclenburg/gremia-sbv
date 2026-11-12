import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DocumentContainerService } from './documentContainerService.js';
import type { RetireImportedFile, TrackImportedFile } from './caseHandoverImportUnitOfWork.js';

export function replaceVacationV5ReturnDocument(database: DatabaseAdapter, input: {
  kind: 'case_document' | 'generated_document'; localId: string; origin: Record<string, unknown>;
  data: Record<string, string | number | boolean | null>; contentBase64: string;
  dataDirectory: string; timestamp: string; trackFile: TrackImportedFile; retireFile: RetireImportedFile;
}): void {
  const { kind, localId, origin, data, contentBase64, dataDirectory, timestamp, trackFile, retireFile } = input;
  if (typeof origin.storage_path !== 'string' || !origin.storage_path
    || kind === 'generated_document' && origin.document_kind !== data.document_kind
    || kind === 'case_document' && typeof origin.case_id !== 'string') {
    throw new Error('Ausgangsdokument hat eine widersprüchliche Zuordnung.');
  }
  const plain = Buffer.from(contentBase64, 'base64');
  try {
    const stored = new DocumentContainerService().writeEncryptedContainerSync({ plain,
      storageRoot: dataDirectory,
      subdirectory: kind === 'case_document' ? `documents/${origin.case_id}` : 'office/handover',
      documentId: randomUUID(), filename: String(data.filename),
      mimeType: typeof data.mime_type === 'string' ? data.mime_type : 'application/octet-stream' });
    trackFile(stored.storagePath);
    if (stored.sha256 !== data.sha256 || stored.sizeBytes !== data.size_bytes) {
      throw new Error('Rückgabedokument stimmt nicht mit den geprüften Metadaten überein.');
    }
    if (kind === 'case_document') {
      const title = typeof data.display_title === 'string'
        ? data.display_title.replace(/^\[Übergabe\] /, '') : data.display_title ?? null;
      database.prepare(`UPDATE case_documents SET filename = ?, display_title = ?, mime_type = ?,
        storage_path = ?, sha256 = ?, document_key = ?, iv = ?, auth_tag = ?, size_bytes = ?,
        contains_health_data = ?, imported_at = ? WHERE id = ?`).run(
        data.filename, title, data.mime_type ?? null, stored.storageReference, stored.sha256,
        stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes,
        data.contains_health_data ?? origin.contains_health_data, timestamp, localId);
    } else {
      database.prepare(`UPDATE generated_documents SET title = ?, filename = ?, mime_type = ?,
        document_kind = ?, template_version = ?, storage_path = ?, sha256 = ?,
        document_key = ?, iv = ?, auth_tag = ?, size_bytes = ? WHERE id = ?`).run(
        data.title, data.filename, data.mime_type, data.document_kind, data.template_version ?? null,
        stored.storageReference, stored.sha256, stored.documentKey, stored.iv,
        stored.authTag, stored.sizeBytes, localId);
    }
    retireFile(origin.storage_path);
  } finally { plain.fill(0); }
}
