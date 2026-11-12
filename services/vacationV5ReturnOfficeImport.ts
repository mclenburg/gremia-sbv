import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DocumentContainerService } from './documentContainerService.js';
import type { TrackImportedFile } from './caseHandoverImportUnitOfWork.js';

type Target = { kind: string; localId: string };
type OfficeChange = { kind: string; data: Record<string, string | number | boolean | null>;
  links?: Record<string, string>; contentBase64?: string };

const OWNER_TYPE: Readonly<Record<string, string>> = {
  meeting: 'meeting', assembly: 'assembly', employer_obligation: 'employer_obligation_review',
  inclusion_agreement: 'inclusion_agreement',
};

function target(targets: Map<string, Target>, ref: string | undefined, kind?: string): Target {
  const found = ref ? targets.get(ref) : undefined;
  if (!found || kind && found.kind !== kind) {
    throw new Error('Rückgabedokument enthält eine nicht übernommene Elternbeziehung.');
  }
  return found;
}

/** Adds a selected office document or its explicit link inside the caller's file-aware transaction. */
export function insertVacationV5ReturnOfficeItem(database: DatabaseAdapter, change: OfficeChange,
  targets: Map<string, Target>, timestamp: string, dataDirectory: string, trackFile: TrackImportedFile): string {
  const id = randomUUID();
  if (change.kind === 'generated_document') {
    if (!change.contentBase64) throw new Error('Rückgabedokument enthält keine geprüften Bytes.');
    const plain = Buffer.from(change.contentBase64, 'base64');
    try {
      const stored = new DocumentContainerService().writeEncryptedContainerSync({ plain,
        storageRoot: dataDirectory, subdirectory: 'office/handover', documentId: id,
        filename: String(change.data.filename), mimeType: String(change.data.mime_type) });
      trackFile(stored.storagePath);
      if (stored.sha256 !== change.data.sha256 || stored.sizeBytes !== change.data.size_bytes) {
        throw new Error('Rückgabedokument stimmt nicht mit den geprüften Metadaten überein.');
      }
      database.prepare(`INSERT INTO generated_documents
        (id, case_id, template_id, violation_id, document_kind, template_version, title, storage_path,
          filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id,
        change.data.document_kind, change.data.template_version ?? null, change.data.title,
        stored.storageReference, stored.filename, stored.mimeType, stored.sha256,
        stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes, timestamp);
      return id;
    } finally { plain.fill(0); }
  }
  const document = target(targets, change.links?.documentRef, 'generated_document');
  const row = database.prepare<{ document_kind: string; violation_id: string | null }>(
    'SELECT document_kind, violation_id FROM generated_documents WHERE id = ?').get(document.localId);
  if (!row) throw new Error('Rückgabedokument wurde nicht gefunden.');
  if (change.kind === 'workflow_document_link') {
    const owner = target(targets, change.links?.ownerRef);
    const ownerType = OWNER_TYPE[owner.kind];
    if (!ownerType || row.document_kind !== 'generic') {
      throw new Error('Rückgabedokument hat einen unzulässigen Eigentümer oder Dokumenttyp.');
    }
    database.prepare(`INSERT INTO sbv_workflow_document_links
      (id, owner_type, owner_id, document_id, purpose, document_class, template_version, legal_rule_version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, ownerType, owner.localId, document.localId,
      change.data.purpose, change.data.document_class, change.data.template_version ?? null,
      change.data.legal_rule_version ?? null, timestamp);
    return id;
  }
  if (change.kind === 'violation_document_link') {
    const owner = target(targets, change.links?.ownerRef, 'violation');
    if (row.document_kind !== 'sbv_participation_violation'
      || row.violation_id && row.violation_id !== owner.localId
      || database.prepare('SELECT id FROM sbv_participation_violation_documents WHERE document_id = ?')
        .get(document.localId)) {
      throw new Error('Verstoßdokument hat eine widersprüchliche Zuordnung.');
    }
    database.prepare('UPDATE generated_documents SET violation_id = ? WHERE id = ?')
      .run(owner.localId, document.localId);
    database.prepare(`INSERT INTO sbv_participation_violation_documents
      (id, violation_id, document_id, stage, template_key, template_version, immutable_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, owner.localId, document.localId,
      change.data.stage, change.data.template_key, change.data.template_version,
      change.data.immutable_snapshot, timestamp);
    return id;
  }
  throw new Error('Unbekannte Amtsdokument-Rückgabe.');
}
