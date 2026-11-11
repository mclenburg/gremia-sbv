import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DocumentContainerService } from './documentContainerService.js';
import { caseHandoverBaselineHash } from './caseHandoverBaselineHash.js';
import { assertVacationV5OfficeDocumentGraph, type VacationV5OfficeDocumentSection } from './vacationV5OfficeDocumentGraph.js';
import type { TrackImportedFile } from './caseHandoverImportUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditCaseHandoverImported } from './auditEventBuilders.js';

const OWNER_TYPE: Readonly<Record<string, string>> = {
  meeting: 'meeting', assembly: 'assembly', employer_obligation: 'employer_obligation_review',
  inclusion_agreement: 'inclusion_agreement',
};

export function importVacationV5OfficeDocuments(database: DatabaseAdapter, importId: string, packageId: string,
  sectionInput: unknown, roots: readonly { ref: string; type: string }[], localByRef: Record<string, string>,
  dataDirectory: string, trackFile: TrackImportedFile): { importedCount: number; localByRef: Record<string, string> } {
  const sections = assertVacationV5OfficeDocumentGraph(sectionInput, roots);
  if (!sections.length) return { importedCount: 0, localByRef: {} };
  const byType = new Map(sections.map((section) => [section.type, section]));
  const typesByRef = new Map(roots.map((root) => [root.ref, root.type]));
  const timestamp = new Date().toISOString();
  const importedByRef: Record<string, string> = {};
  const violationOwnerByDoc = new Map<string, string>();
  for (const item of byType.get('violation_document_link')?.items ?? []) {
    if (!item.documentRef || !item.ownerRef || violationOwnerByDoc.has(item.documentRef)) {
      throw new Error('Amtsdokument hat mehrere Verstoßzuordnungen.');
    }
    const ownerId = localByRef[item.ownerRef];
    if (!ownerId) throw new Error('Amtsdokument enthält eine ungelöste Verstoßreferenz.');
    violationOwnerByDoc.set(item.documentRef, ownerId);
  }
  const containers = new DocumentContainerService();
  for (const item of byType.get('generated_document')?.items ?? []) {
    const id = randomUUID();
    const plain = Buffer.from(item.contentBase64!, 'base64');
    try {
      const stored = containers.writeEncryptedContainerSync({ plain, storageRoot: dataDirectory,
        subdirectory: 'office/handover', documentId: id, filename: String(item.data.filename),
        mimeType: String(item.data.mime_type) });
      trackFile(stored.storagePath);
      database.prepare(`INSERT INTO generated_documents
        (id, case_id, template_id, violation_id, document_kind, template_version, title, storage_path,
          filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, violationOwnerByDoc.get(item.ref) ?? null, item.data.document_kind,
          item.data.template_version ?? null, item.data.title, stored.storageReference, stored.filename,
          stored.mimeType, stored.sha256, stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes, timestamp);
      const row = database.prepare<Record<string, unknown>>('SELECT * FROM generated_documents WHERE id = ?').get(id);
      if (!row) throw new Error('Importiertes Amtsdokument konnte nicht bestätigt werden.');
      recordImportedItem(database, importId, item.ref, 'generated_document', id,
        caseHandoverBaselineHash(row, item.contentBase64));
      importedByRef[item.ref] = id;
    } finally { plain.fill(0); }
  }
  for (const type of ['workflow_document_link', 'violation_document_link'] as const) {
    const section: VacationV5OfficeDocumentSection | undefined = byType.get(type);
    for (const item of section?.items ?? []) {
      const id = randomUUID();
      const documentId = importedByRef[item.documentRef!];
      const ownerId = localByRef[item.ownerRef!];
      if (!documentId || !ownerId) throw new Error('Amtsdokumentverknüpfung ist nicht auflösbar.');
      if (type === 'workflow_document_link') {
        const ownerType = OWNER_TYPE[typesByRef.get(item.ownerRef!) ?? ''];
        if (!ownerType) throw new Error('Amtsdokument hat einen unzulässigen Eigentümer.');
        database.prepare(`INSERT INTO sbv_workflow_document_links
          (id, owner_type, owner_id, document_id, purpose, document_class, template_version, legal_rule_version, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, ownerType, ownerId, documentId, item.data.purpose, item.data.document_class,
            item.data.template_version ?? null, item.data.legal_rule_version ?? null, timestamp);
      } else {
        database.prepare(`INSERT INTO sbv_participation_violation_documents
          (id, violation_id, document_id, stage, template_key, template_version, immutable_snapshot, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, ownerId, documentId, item.data.stage, item.data.template_key,
            item.data.template_version, item.data.immutable_snapshot, timestamp);
      }
      const table = type === 'workflow_document_link' ? 'sbv_workflow_document_links'
        : 'sbv_participation_violation_documents';
      const row = database.prepare<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      if (!row) throw new Error('Importierte Amtsdokumentverknüpfung konnte nicht bestätigt werden.');
      recordImportedItem(database, importId, item.ref, type, id, caseHandoverBaselineHash(row));
      importedByRef[item.ref] = id;
    }
  }
  new PersonalDataAuditLogService(database).append(auditCaseHandoverImported({
    packageId, caseCount: 0, documentCount: byType.get('generated_document')?.count ?? 0,
    mode: 'vacation_v5', validUntilPresent: true, result: 'success',
  }));
  return { importedCount: Object.keys(importedByRef).length, localByRef: importedByRef };
}

function recordImportedItem(database: DatabaseAdapter, importId: string, ref: string,
  kind: string, localId: string, baselineSha256: string): void {
  database.prepare(`INSERT INTO case_handover_import_items
    (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), importId, kind, localId, ref, new Date().toISOString(), baselineSha256);
}
