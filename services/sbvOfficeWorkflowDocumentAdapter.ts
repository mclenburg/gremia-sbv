import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { DocumentContainerService } from './documentContainerService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditSbvOfficeDocumentChanged } from './auditEventBuilders.js';
import { RetentionOwnerRegistry } from './retentionOwnerRegistry.js';
import type { RetentionOwnerRef } from '../src/domain/models/retention-owner.model.js';
import type { ElectionDocumentClass } from '../src/domain/models/election.model.js';

export interface StoreSbvOfficeDocumentInput {
  owner: RetentionOwnerRef;
  title: string;
  filename: string;
  mimeType: string;
  purpose: string;
  documentClass: ElectionDocumentClass;
  templateVersion?: string;
  legalRuleVersion?: string;
  plain: Buffer;
}

export interface SbvOfficeDocumentRecord {
  id: string;
  owner: RetentionOwnerRef;
  title: string;
  filename: string;
  mimeType: string;
  purpose: string;
  documentClass: ElectionDocumentClass;
  templateVersion?: string;
  legalRuleVersion?: string;
  sha256: string;
  sizeBytes: number;
  createdAt: string;
}

interface DocumentRow {
  id: string; title: string; filename: string | null; mime_type: string | null; sha256: string | null;
  size_bytes: number | null; created_at: string; storage_path: string; document_key: string; iv: string; auth_tag: string;
  owner_type: RetentionOwnerRef['type']; owner_id: string; purpose: string; document_class: ElectionDocumentClass;
}

export class SbvOfficeWorkflowDocumentAdapter {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly storageRoot: string,
    private readonly containers = new DocumentContainerService(),
    private readonly owners = new RetentionOwnerRegistry(),
  ) {}

  async store(input: StoreSbvOfficeDocumentInput): Promise<SbvOfficeDocumentRecord> {
    if (input.owner.type === 'case') throw new Error('Fallbezogene Dokumente verwenden weiterhin die Fallakten-Dokumentablage.');
    if (!this.owners.exists(this.database, input.owner)) throw new Error('Dokument kann nur einem vorhandenen SBV-Amtsvorgang zugeordnet werden.');
    const title = input.title.trim();
    const purpose = input.purpose.trim();
    if (!title || !purpose) throw new Error('Dokument benötigt Titel und Zweck.');
    const documentId = randomUUID();
    const linkId = randomUUID();
    const container = await this.containers.writeEncryptedContainer({
      plain: input.plain,
      storageRoot: this.storageRoot,
      subdirectory: `office/${input.owner.type}`,
      documentId,
      filename: input.filename,
      mimeType: input.mimeType,
    });
    const now = new Date().toISOString();
    try {
      new DatabaseUnitOfWork(this.database).run(() => {
        this.database.prepare(`
          INSERT INTO generated_documents (
            id, case_id, template_id, violation_id, document_kind, template_version, title,
            storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at
          ) VALUES (?, NULL, NULL, NULL, 'generic', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          documentId, title, container.storagePath, container.filename, container.mimeType, container.sha256,
          container.documentKey, container.iv, container.authTag, container.sizeBytes, now,
        );
        this.database.prepare(`
          INSERT INTO sbv_workflow_document_links (
            id, owner_type, owner_id, document_id, purpose, document_class, template_version, legal_rule_version, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(linkId, input.owner.type, input.owner.id, documentId, purpose, input.documentClass, input.templateVersion?.trim() || null, input.legalRuleVersion?.trim() || null, now);
        new PersonalDataAuditLogService(this.database).append(auditSbvOfficeDocumentChanged({
          action: 'create', documentId, ownerType: input.owner.type, ownerId: input.owner.id, documentClass: input.documentClass,
        }));
      });
    } catch (error) {
      await fs.promises.rm(container.storagePath, { force: true }).catch(() => undefined);
      throw error;
    }
    return {
      id: documentId,
      owner: input.owner,
      title,
      filename: container.filename,
      mimeType: container.mimeType,
      purpose,
      documentClass: input.documentClass,
      templateVersion: input.templateVersion?.trim() || undefined,
      legalRuleVersion: input.legalRuleVersion?.trim() || undefined,
      sha256: container.sha256,
      sizeBytes: container.sizeBytes,
      createdAt: now,
    };
  }

  async read(documentId: string): Promise<Buffer> {
    const row = this.database.prepare<DocumentRow>(`
      SELECT d.*, l.owner_type, l.owner_id, l.purpose, l.document_class
      FROM generated_documents d
      JOIN sbv_workflow_document_links l ON l.document_id = d.id
      WHERE d.id = ?
    `).get(documentId);
    if (!row) throw new Error('SBV-Amtsdokument wurde nicht gefunden.');
    return this.containers.readEncryptedContainer({
      storageRoot: this.storageRoot,
      storagePath: row.storage_path,
      documentKey: row.document_key,
      iv: row.iv,
      authTag: row.auth_tag,
      expectedSha256: row.sha256 ?? undefined,
    });
  }
}
