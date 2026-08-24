import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { DocumentContainerService, safeDocumentFilePart } from './documentContainerService.js';
import { SbvParticipationViolationService } from './sbvParticipationViolationService.js';
import { SbvParticipationViolationTemplateService } from './sbvParticipationViolationTemplateService.js';
import type {
  SbvParticipationViolationDocumentResult,
  SbvParticipationViolationGeneratedDocumentRecord,
  SbvParticipationViolationRecord,
  SbvParticipationViolationTemplateInput,
} from '../src/domain/models/sbv-participation-violation.model.js';
import { addColumnsIfMissing } from './migrations/schemaColumnMigration.js';
import { externalLetterDocument, paragraph } from './documents/pdfDocumentDefinition.js';
import { PdfDocumentGenerationService } from './documents/pdfDocumentGenerationService.js';

const PDF_MIME = 'application/pdf';

type ParticipationViolationReader = {
  get(violationId: string): SbvParticipationViolationRecord | null | undefined;
};

type ViolationDocumentRow = {
  id: string;
  violation_id: string;
  document_id: string;
  stage: SbvParticipationViolationGeneratedDocumentRecord['stage'];
  template_key: string;
  template_version: string;
  immutable_snapshot: number;
  created_at: string;
};

function nowIso(): string { return new Date().toISOString(); }
function mapViolationDocument(row: ViolationDocumentRow): SbvParticipationViolationGeneratedDocumentRecord {
  return {
    id: String(row.id),
    violationId: String(row.violation_id),
    documentId: String(row.document_id),
    stage: row.stage as SbvParticipationViolationGeneratedDocumentRecord['stage'],
    templateKey: String(row.template_key),
    templateVersion: String(row.template_version),
    immutableSnapshot: Boolean(row.immutable_snapshot),
    createdAt: String(row.created_at),
  };
}

export class SbvParticipationViolationDocumentService {
  private readonly templateService = new SbvParticipationViolationTemplateService();
  private readonly pdfDocuments = new PdfDocumentGenerationService();

  constructor(
    private readonly db: DatabaseAdapter,
    private readonly dataDirProvider: () => string,
    private readonly violationService: ParticipationViolationReader = new SbvParticipationViolationService(db),
  ) {}

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participation_violation_documents (
        id TEXT PRIMARY KEY,
        violation_id TEXT NOT NULL REFERENCES sbv_participation_violations(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE RESTRICT,
        stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
        template_key TEXT NOT NULL,
        template_version TEXT NOT NULL,
        immutable_snapshot INTEGER NOT NULL DEFAULT 1 CHECK (immutable_snapshot IN (0,1)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violation_documents_violation ON sbv_participation_violation_documents(violation_id);
    `);
    addColumnsIfMissing(this.db, 'generated_documents', [
      ['filename', 'TEXT'], ['mime_type', 'TEXT'], ['sha256', 'TEXT'], ['document_key', 'TEXT'], ['iv', 'TEXT'], ['auth_tag', 'TEXT'], ['size_bytes', 'INTEGER']
    ]);
  }

  async generateDocument(violationId: string, options: Partial<Pick<SbvParticipationViolationTemplateInput, 'recipientLabel' | 'privacyMode' | 'includeLegalReviewHint' | 'includeOwiHint'>> = {}): Promise<SbvParticipationViolationDocumentResult> {
    const violation = this.violationService.get(violationId);
    if (!violation) throw new Error(`Beteiligungsverstoß nicht gefunden: ${violationId}`);
    const input = this.templateService.buildInputFromViolation(violation, options);
    const validation = this.templateService.validate(input);
    if (!validation.valid) throw new Error(`Dokument kann nicht erzeugt werden. Pflichtangaben fehlen: ${validation.missingFields.join(', ')}`);
    const templateKey = this.templateService.getTemplateKey(violation.stage);
    const templateVersion = this.templateService.getTemplateVersion();
    const plainText = this.templateService.buildPlainText(input);
    const pdfBuffer = await this.pdfDocuments.generate({
      source: 'measure',
      privacyProfile: 'lawful_personal_data',
      definition: externalLetterDocument({
        title: input.subject,
        sender: ['Schwerbehindertenvertretung'],
        recipient: [input.recipientLabel || 'Arbeitgeber'],
        date: new Intl.DateTimeFormat('de-DE').format(new Date()),
        subject: input.subject,
        blocks: plainText.split(/\n\s*\n/u).map((text) => paragraph(text)),
      }),
    });
    const documentId = randomUUID();
    const violationDocumentId = randomUUID();
    const timestamp = nowIso();
    const filename = `${safeDocumentFilePart(violation.subject)}-${documentId}.pdf`;
    const container = await new DocumentContainerService().writeEncryptedContainer({
      plain: pdfBuffer,
      storageRoot: this.dataDirProvider(),
      subdirectory: 'generated-documents/sbv-participation-violations',
      documentId,
      filename,
      mimeType: PDF_MIME,
    });
    const title = `Beteiligungsverstoß: ${violation.subject}`;
    this.db.prepare(`
      INSERT INTO generated_documents (id, case_id, template_id, violation_id, document_kind, template_version, title, storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId, violation.caseId ?? null, null, violation.id, 'sbv_participation_violation', templateVersion, title, container.storagePath,
      container.filename, container.mimeType, container.sha256, container.documentKey, container.iv, container.authTag, container.sizeBytes, timestamp,
    );
    this.db.prepare(`
      INSERT INTO sbv_participation_violation_documents (id, violation_id, document_id, stage, template_key, template_version, immutable_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(violationDocumentId, violation.id, documentId, violation.stage, templateKey, templateVersion, timestamp);
    this.db.prepare(`
      INSERT INTO sbv_participation_violation_events (id, violation_id, event_type, from_status, to_status, note, created_at)
      VALUES (?, ?, 'document_generated', ?, ?, ?, ?)
    `).run(randomUUID(), violation.id, violation.status, violation.status, 'PDF-Dokument zentral erzeugt und verschlüsselt abgelegt.', timestamp);
    this.auditGenerated(violation.id, documentId, violation.caseId, templateKey, templateVersion, violation.stage);
    return {
      documentId,
      violationDocumentId,
      title,
      filename,
      mimeType: PDF_MIME,
      sha256: container.sha256,
      sizeBytes: container.sizeBytes,
      templateKey,
      templateVersion,
      storagePath: container.storagePath,
      legalReviewHint: input.includeLegalReviewHint,
      warnings: validation.warnings,
    };
  }

  listDocuments(violationId: string): SbvParticipationViolationGeneratedDocumentRecord[] {
    return this.db.prepare<ViolationDocumentRow>('SELECT * FROM sbv_participation_violation_documents WHERE violation_id = ? ORDER BY created_at DESC').all(violationId).map(mapViolationDocument);
  }

  private auditGenerated(violationId: string, documentId: string, caseId: string | undefined, templateKey: string, templateVersion: string, stage: string): void {
    new PersonalDataAuditLogService(this.db).append({
        actor: 'sbv',
        action: 'create',
        subjectType: 'sbv_participation_violation_document',
        subjectId: documentId,
        caseId,
        purpose: 'SBV-Beteiligungsverstoß-Dokument erzeugen',
        metadata: { violationId, stage, templateKey, templateVersion, documentKind: 'sbv_participation_violation' },
      });
  }
}
