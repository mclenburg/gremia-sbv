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
import { externalLetterDocument, paragraph } from './documents/pdfDocumentDefinition.js';
import { PdfDocumentGenerationService } from './documents/pdfDocumentGenerationService.js';
import {
  documentDefaultsForDatabase,
  employerRecipientLines,
  sbvSenderLines,
  sbvSignature,
} from './documents/documentIdentityPolicy.js';
import { ensureSbvParticipationViolationDocumentRuntimeSchema } from './runtimeSchemaCompatibility.js';

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

type GeneratedViolationDocumentRow = {
  storage_path: string;
  document_key: string;
  iv: string;
  auth_tag: string;
  sha256: string | null;
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
    private readonly database: DatabaseAdapter,
    private readonly dataDirProvider: () => string,
    private readonly violationService: ParticipationViolationReader = new SbvParticipationViolationService(database),
  ) {}

  ensureSchema(): void {
    ensureSbvParticipationViolationDocumentRuntimeSchema(this.database);
  }

  async generateDocument(violationId: string, options: Partial<Pick<SbvParticipationViolationTemplateInput, 'recipientLabel' | 'privacyMode' | 'includeLegalReviewHint' | 'includeOwiHint'>> = {}): Promise<SbvParticipationViolationDocumentResult> {
    const violation = this.violationService.get(violationId);
    if (!violation) throw new Error(`Beteiligungsverstoß nicht gefunden: ${violationId}`);
    const input = this.templateService.buildInputFromViolation(violation, options);
    const validation = this.templateService.validate(input);
    if (!validation.valid) throw new Error(`Dokument kann nicht erzeugt werden. Pflichtangaben fehlen: ${validation.missingFields.join(', ')}`);
    const defaults = documentDefaultsForDatabase(this.database);
    const templateKey = this.templateService.getTemplateKey(violation.stage);
    const templateVersion = this.templateService.getTemplateVersion();
    const plainText = this.templateService.buildPlainText(input, { signature: sbvSignature(defaults) });
    const pdfBuffer = await this.pdfDocuments.generate({
      source: 'measure',
      privacyProfile: 'lawful_personal_data',
      definition: externalLetterDocument({
        title: input.subject,
        sender: sbvSenderLines(defaults),
        recipient: input.recipientLabel?.trim() && input.recipientLabel.trim() !== 'Arbeitgeber'
          ? [input.recipientLabel.trim()]
          : employerRecipientLines(defaults),
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
    this.database.prepare(`
      INSERT INTO generated_documents (id, case_id, template_id, violation_id, document_kind, template_version, title, storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId, violation.caseId ?? null, null, violation.id, 'sbv_participation_violation', templateVersion, title, container.storagePath,
      container.filename, container.mimeType, container.sha256, container.documentKey, container.iv, container.authTag, container.sizeBytes, timestamp,
    );
    this.database.prepare(`
      INSERT INTO sbv_participation_violation_documents (id, violation_id, document_id, stage, template_key, template_version, immutable_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(violationDocumentId, violation.id, documentId, violation.stage, templateKey, templateVersion, timestamp);
    this.database.prepare(`
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
    return this.database.prepare<ViolationDocumentRow>('SELECT * FROM sbv_participation_violation_documents WHERE violation_id = ? ORDER BY created_at DESC').all(violationId).map(mapViolationDocument);
  }

  async readDocument(documentId: string): Promise<Buffer> {
    const row = this.database.prepare<GeneratedViolationDocumentRow>(`
      SELECT storage_path, document_key, iv, auth_tag, sha256
      FROM generated_documents
      WHERE id = ? AND document_kind = 'sbv_participation_violation'
    `).get(documentId);
    if (!row) throw new Error('Beteiligungsverstoß-Dokument wurde nicht gefunden.');
    return new DocumentContainerService().readEncryptedContainer({
      storageRoot: this.dataDirProvider(),
      storagePath: row.storage_path,
      documentKey: row.document_key,
      iv: row.iv,
      authTag: row.auth_tag,
      expectedSha256: row.sha256 ?? undefined,
    });
  }

  private auditGenerated(violationId: string, documentId: string, caseId: string | undefined, templateKey: string, templateVersion: string, stage: string): void {
    new PersonalDataAuditLogService(this.database).append({
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
