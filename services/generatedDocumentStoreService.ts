import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { DocumentContainerService } from './documentContainerService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';

export interface StoreGeneratedDocumentInput {
  title: string;
  filename: string;
  mimeType: string;
  plain: Buffer;
  source: 'template' | 'report' | 'compliance' | 'document';
  templateId?: string | null;
  caseId?: string | null;
  templateVersion?: string | null;
}

export interface GeneratedDocumentRecord {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  source: StoreGeneratedDocumentInput['source'];
  sha256: string;
  sizeBytes: number;
  createdAt: string;
}

interface GeneratedDocumentRow {
  id: string;
  title: string;
  filename: string | null;
  mime_type: string | null;
  storage_path: string;
  sha256: string | null;
  document_key: string;
  iv: string;
  auth_tag: string;
  size_bytes: number | null;
  created_at: string;
}

function documentKindForSource(_source: StoreGeneratedDocumentInput['source']): 'generic' {
  return 'generic';
}

export class GeneratedDocumentStoreService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly storageRoot: string,
    private readonly containers = new DocumentContainerService(),
  ) {}

  async store(input: StoreGeneratedDocumentInput): Promise<GeneratedDocumentRecord> {
    const title = input.title.trim();
    const filename = input.filename.trim();
    const mimeType = input.mimeType.trim();
    if (!title || !filename || !mimeType) throw new Error('Erzeugtes Dokument benötigt Titel, Dateiname und MIME-Typ.');
    const documentId = randomUUID();
    const container = await this.containers.writeEncryptedContainer({
      plain: input.plain,
      storageRoot: this.storageRoot,
      subdirectory: `generated/${input.source}`,
      documentId,
      filename,
      mimeType,
    });
    const now = new Date().toISOString();
    try {
      new DatabaseUnitOfWork(this.database).run(() => {
        this.database.prepare(`
          INSERT INTO generated_documents (
            id, case_id, template_id, violation_id, document_kind, template_version, title,
            storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at
          ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          documentId,
          input.caseId?.trim() || null,
          input.templateId?.trim() || null,
          documentKindForSource(input.source),
          input.templateVersion?.trim() || null,
          title,
          container.storagePath,
          container.filename,
          container.mimeType,
          container.sha256,
          container.documentKey,
          container.iv,
          container.authTag,
          container.sizeBytes,
          now,
        );
        new PersonalDataAuditLogService(this.database).append({
          action: 'create',
          subjectType: 'generated_document',
          subjectId: documentId,
          caseId: input.caseId?.trim() || undefined,
          purpose: 'Erzeugtes PDF-Dokument verschlüsselt abgelegt; Audit enthält keine Dokumentinhalte.',
          metadata: {
            documentKind: documentKindForSource(input.source),
            templateVersion: input.templateVersion?.trim() || undefined,
          },
        });
      });
    } catch (error) {
      await fs.promises.rm(container.storagePath, { force: true }).catch(() => undefined);
      throw error;
    }
    return {
      id: documentId,
      title,
      filename: container.filename,
      mimeType: container.mimeType,
      source: input.source,
      sha256: container.sha256,
      sizeBytes: container.sizeBytes,
      createdAt: now,
    };
  }

  async read(documentId: string): Promise<Buffer> {
    const row = this.database.prepare<GeneratedDocumentRow>(`
      SELECT id, title, filename, mime_type, storage_path, sha256, document_key, iv, auth_tag, size_bytes, created_at
      FROM generated_documents
      WHERE id = ?
    `).get(documentId);
    if (!row) throw new Error('Erzeugtes Dokument wurde nicht gefunden.');
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
