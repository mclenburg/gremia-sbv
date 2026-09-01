import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from '../databaseService.js';
import { DatabaseUnitOfWork } from '../databaseUnitOfWork.js';
import { GeneratedDocumentStoreService } from '../generatedDocumentStoreService.js';
import { PersonalDataAuditLogService } from '../auditLogService.js';
import { safeDocumentFilePart } from '../documentContainerService.js';
import { PdfDocumentGenerationService } from '../documents/pdfDocumentGenerationService.js';
import { auditGremiaBrWorkspaceAction } from '../auditEventBuilders.js';
import type {
  CreateGremiaBrCaseSummaryInput,
  GremiaBrAgendaItemRequestResult,
  GremiaBrCreatedPdfDocument,
  GremiaBrDocumentTransferResult,
  GremiaBrGeneratedPdfDocument,
  GremiaBrProtectionClass,
  RequestGremiaBrAgendaItemInput,
  TransferGremiaBrDocumentInput,
} from '../../src/domain/models/gremia-br.model.js';
import { gremiaBrArrayFromResponse } from './gremiaBrPayload.js';
import { buildGremiaBrCaseSummaryDocument } from './gremiaBrCaseSummaryDocument.js';
import {
  boundedLimit,
  acceptedDocumentUploadFromResponse,
  documentShareAcceptanceFromResponse,
  documentShareMessage,
  existingAgendaItemFromPayload,
  GREMIA_BR_PDF_MIME_TYPE,
  nowIso,
  numberOrUndefined,
  optionalText,
  requireV2WorkspaceContext,
  responseId,
  trimRequired,
  type CaseSummaryRow,
  type DeadlineRow,
  type DraftAgendaItem,
  type GeneratedDocumentRow,
  type GremiaBrReferenceRow,
  type GremiaBrWorkspaceActionAuthPort,
  type MeasureRow,
  type WorkspaceActionInput,
} from './gremiaBrWorkspaceActionSupport.js';

export class GremiaBrWorkspaceActionService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly dataDirectoryProvider: () => string,
    private readonly auth: GremiaBrWorkspaceActionAuthPort,
    private readonly documentStore = new GeneratedDocumentStoreService(database, dataDirectoryProvider()),
    private readonly pdfDocuments = new PdfDocumentGenerationService(),
  ) {}

  listTransferableDocuments(limit = 50): GremiaBrGeneratedPdfDocument[] {
    return this.database.prepare<GeneratedDocumentRow>(`
      SELECT d.id, d.title, d.filename, d.mime_type, d.document_kind, d.sha256, d.size_bytes, d.created_at,
             d.case_id, c.case_number, c.display_name AS case_display_name
      FROM generated_documents d
      LEFT JOIN cases c ON c.id = d.case_id
      WHERE d.mime_type = ?
      ORDER BY d.created_at DESC
      LIMIT ?
    `).all(GREMIA_BR_PDF_MIME_TYPE, boundedLimit(limit)).map((row) => ({
      id: row.id,
      title: row.title,
      filename: row.filename ?? `${safeDocumentFilePart(row.title)}.pdf`,
      mimeType: GREMIA_BR_PDF_MIME_TYPE,
      caseId: row.case_id ?? undefined,
      caseNumber: row.case_number ?? undefined,
      caseDisplayName: row.case_display_name ?? undefined,
      documentKind: row.document_kind ?? 'generic',
      sha256: row.sha256 ?? undefined,
      sizeBytes: row.size_bytes ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async createCaseSummaryDocument(input: CreateGremiaBrCaseSummaryInput): Promise<GremiaBrCreatedPdfDocument> {
    const caseId = trimRequired(input.caseId, 'Fallakte');
    const purpose = trimRequired(input.purpose, 'Zweck der BR-Information');
    const caseSummary = this.caseSummary(caseId);
    if (!caseSummary) throw new Error('Fallakte wurde nicht gefunden.');
    const pdf = await this.pdfDocuments.generate({
      source: 'report',
      privacyProfile: 'lawful_personal_data',
      definition: buildGremiaBrCaseSummaryDocument({
        caseSummary,
        purpose,
        recipientLabel: input.recipientLabel,
        measures: this.measureRows(caseId),
        deadlines: this.openDeadlineRows(caseId),
        references: this.referenceRows(caseId),
      }),
    });
    const stored = await this.documentStore.store({
      source: 'document',
      caseId,
      title: `Fallzusammenfassung für Gremia.BR: ${caseSummary.case_number}`,
      filename: `fallzusammenfassung-gremia-br-${safeDocumentFilePart(caseSummary.case_number)}.pdf`,
      mimeType: GREMIA_BR_PDF_MIME_TYPE,
      plain: pdf,
    });
    return {
      id: stored.id,
      title: stored.title,
      filename: stored.filename,
      mimeType: GREMIA_BR_PDF_MIME_TYPE,
      sha256: stored.sha256,
      sizeBytes: stored.sizeBytes,
      createdAt: stored.createdAt,
    };
  }

  async transferGeneratedPdf(input: TransferGremiaBrDocumentInput): Promise<GremiaBrDocumentTransferResult> {
    const context = requireV2WorkspaceContext(this.auth.getReadContext());
    const documentId = trimRequired(input.documentId, 'PDF-Dokument');
    const purpose = trimRequired(input.purpose, 'Freigabezweck');
    const targetSecurityDomain = trimRequired(input.targetSecurityDomain, 'Ziel-Sicherheitsbereich');
    const document = this.generatedDocument(documentId);
    if (!document || document.mime_type !== GREMIA_BR_PDF_MIME_TYPE) throw new Error('Es können nur von Gremia.SBV erzeugte PDF-Dokumente übertragen werden.');
    const plain = await this.documentStore.read(documentId);
    try {
      const uploadPayload = await this.auth.post<unknown>('/api/v1/documents', {
        query: { organizationId: context.selectedOrganizationId, securityDomain: context.selectedSecurityDomain },
        formData: this.documentUploadForm(document, plain, context.selectedBodyId, input.protectionClass ?? 'HIGH', purpose),
      });
      const upload = acceptedDocumentUploadFromResponse(uploadPayload);
      const remoteDocumentId = upload.documentId;
      const uploadedActionId = this.recordDocumentUpload(input, document, targetSecurityDomain, remoteDocumentId, purpose);
      const sharePayload = await this.auth.post<unknown>(`/api/v1/documents/${encodeURIComponent(remoteDocumentId)}/shares`, {
        query: { organizationId: context.selectedOrganizationId, securityDomain: context.selectedSecurityDomain },
        body: {
          targetSecurityDomain,
          purpose,
          validUntil: optionalText(input.validUntil),
          documentVersionId: upload.documentVersionId,
          soloJustification: optionalText(input.soloJustification),
        },
      });
      const share = documentShareAcceptanceFromResponse(sharePayload);
      const sharedActionId = this.recordDocumentShare(input, document, targetSecurityDomain, remoteDocumentId, share.shareId, purpose, share.status);
      return {
        id: share.shareId ? sharedActionId : uploadedActionId,
        localDocumentId: document.id,
        localDocumentTitle: document.title,
        remoteDocumentId,
        remoteShareId: share.shareId,
        targetSecurityDomain,
        targetBodyName: input.targetBodyName ?? context.selectedBodyName,
        status: share.status,
        message: documentShareMessage(share),
        createdAt: nowIso(),
      };
    } finally {
      plain.fill(0);
    }
  }

  async requestAgendaItem(input: RequestGremiaBrAgendaItemInput): Promise<GremiaBrAgendaItemRequestResult> {
    const context = requireV2WorkspaceContext(this.auth.getReadContext());
    const meetingId = trimRequired(input.meetingId, 'Sitzung');
    const title = trimRequired(input.title, 'Tagesordnungspunkt');
    const currentAgendaPayload = await this.auth.get<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/agenda`, {
      query: { organizationId: context.selectedOrganizationId, securityDomain: context.selectedSecurityDomain },
    });
    const currentItems = gremiaBrArrayFromResponse(currentAgendaPayload).map(existingAgendaItemFromPayload);
    if (currentItems.some((item) => item === null)) {
      throw new Error('Die vorhandene Gremia.BR-Tagesordnung konnte nicht sicher übernommen werden.');
    }
    const payload = await this.auth.post<unknown>(`/api/v1/meetings/${encodeURIComponent(meetingId)}/agenda`, {
      query: { organizationId: context.selectedOrganizationId, securityDomain: context.selectedSecurityDomain },
      body: { items: this.appendSbvAgendaItem(currentItems as DraftAgendaItem[], input, title), changeNote: 'SBV-Anforderung aus Gremia.SBV' },
    });
    const agendaVersionId = responseId(payload, 'agendaVersionId', 'versionId');
    const actionId = this.recordAction({
      actionType: 'agenda_item_requested',
      targetBodyId: context.selectedBodyId,
      targetBodyName: context.selectedBodyName,
      targetSecurityDomain: context.selectedSecurityDomain,
      remoteMeetingId: meetingId,
      remoteAgendaVersionId: agendaVersionId,
      purpose: `SBV-Tagesordnungspunkt angefordert: ${title}`,
      status: 'requested',
    });
    return {
      id: actionId,
      meetingId,
      agendaVersionId,
      title,
      status: 'requested',
      message: 'SBV-Tagesordnungspunkt wurde an Gremia.BR übergeben.',
      createdAt: nowIso(),
    };
  }

  private appendSbvAgendaItem(currentItems: DraftAgendaItem[], input: RequestGremiaBrAgendaItemInput, title: string): DraftAgendaItem[] {
    return [...currentItems, {
      title,
      description: optionalText(input.description),
      type: 'CONSULTATION',
      source: 'SBV_REQUEST',
      protectionClass: input.protectionClass ?? 'CONFIDENTIAL',
      timeAllocationMinutes: numberOrUndefined(input.timeAllocationMinutes),
    }];
  }

  private recordDocumentUpload(input: TransferGremiaBrDocumentInput, document: GeneratedDocumentRow, targetSecurityDomain: string, remoteDocumentId: string, purpose: string): string {
    const context = requireV2WorkspaceContext(this.auth.getReadContext());
    return this.recordAction({
      actionType: 'document_uploaded',
      localDocumentId: document.id,
      caseId: document.case_id ?? undefined,
      targetBodyId: input.targetBodyId ?? context.selectedBodyId,
      targetBodyName: input.targetBodyName ?? context.selectedBodyName,
      targetSecurityDomain,
      remoteDocumentId,
      purpose,
      status: 'uploaded',
    });
  }

  private recordDocumentShare(input: TransferGremiaBrDocumentInput, document: GeneratedDocumentRow, targetSecurityDomain: string, remoteDocumentId: string, remoteShareId: string | undefined, purpose: string, status: 'shared' | 'requested'): string {
    const context = requireV2WorkspaceContext(this.auth.getReadContext());
    return this.recordAction({
      actionType: 'document_shared',
      localDocumentId: document.id,
      caseId: document.case_id ?? undefined,
      targetBodyId: input.targetBodyId ?? context.selectedBodyId,
      targetBodyName: input.targetBodyName ?? context.selectedBodyName,
      targetSecurityDomain,
      remoteDocumentId,
      remoteShareId,
      purpose,
      status,
    });
  }

  private caseSummary(caseId: string): CaseSummaryRow | undefined {
    return this.database.prepare<CaseSummaryRow>(`
      SELECT c.id, c.case_number, c.display_name, c.category, c.status, c.priority, c.opened_at, c.closed_at, c.summary, c.risk_level,
             p.first_name, p.last_name, p.organizational_unit, p.employment_state, p.protection_status, p.status_valid_until
      FROM cases c
      LEFT JOIN protected_persons p ON p.id = c.protected_person_id
      WHERE c.id = ?
    `).get(caseId);
  }

  private measureRows(caseId: string): MeasureRow[] {
    return this.database.prepare<MeasureRow>(`
      SELECT title, type, status, risk_level, summary, next_step, due_at, opened_at, closed_at
      FROM case_measures
      WHERE case_id = ?
      ORDER BY COALESCE(due_at, opened_at) DESC
      LIMIT 12
    `).all(caseId);
  }

  private openDeadlineRows(caseId: string): DeadlineRow[] {
    return this.database.prepare<DeadlineRow>(`
      SELECT title, due_at, severity, status, legal_basis
      FROM deadlines
      WHERE case_id = ? AND status NOT IN ('completed', 'cancelled', 'erledigt')
      ORDER BY due_at ASC
      LIMIT 12
    `).all(caseId);
  }

  private referenceRows(caseId: string): GremiaBrReferenceRow[] {
    return this.database.prepare<GremiaBrReferenceRow>(`
      SELECT source_type, title, description
      FROM case_external_references
      WHERE case_id = ? AND source_system = 'gremia_br'
      ORDER BY updated_at DESC
      LIMIT 8
    `).all(caseId);
  }

  private generatedDocument(documentId: string): GeneratedDocumentRow | undefined {
    return this.database.prepare<GeneratedDocumentRow>(`
      SELECT d.id, d.title, d.filename, d.mime_type, d.document_kind, d.sha256, d.size_bytes, d.created_at,
             d.case_id, c.case_number, c.display_name AS case_display_name
      FROM generated_documents d
      LEFT JOIN cases c ON c.id = d.case_id
      WHERE d.id = ?
    `).get(documentId);
  }

  private documentUploadForm(document: GeneratedDocumentRow, plain: Buffer, bodyId: string, protectionClass: GremiaBrProtectionClass, purpose: string): FormData {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(plain)], { type: GREMIA_BR_PDF_MIME_TYPE }), document.filename ?? `${safeDocumentFilePart(document.title)}.pdf`);
    form.append('bodyId', bodyId);
    form.append('protectionClass', protectionClass);
    form.append('title', document.title);
    form.append('description', purpose);
    return form;
  }

  private recordAction(input: WorkspaceActionInput): string {
    const actionId = randomUUID();
    const timestamp = nowIso();
    new DatabaseUnitOfWork(this.database).run(() => {
      this.database.prepare(`
        INSERT INTO gremia_br_workspace_actions (
          id, action_type, local_document_id, case_id, target_body_id, target_body_name, target_security_domain,
          remote_document_id, remote_share_id, remote_meeting_id, remote_agenda_version_id, purpose, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        actionId,
        input.actionType,
        input.localDocumentId ?? null,
        input.caseId ?? null,
        input.targetBodyId ?? null,
        input.targetBodyName ?? null,
        input.targetSecurityDomain ?? null,
        input.remoteDocumentId ?? null,
        input.remoteShareId ?? null,
        input.remoteMeetingId ?? null,
        input.remoteAgendaVersionId ?? null,
        input.purpose,
        input.status,
        timestamp,
      );
      new PersonalDataAuditLogService(this.database).append(auditGremiaBrWorkspaceAction({
        action: input.actionType === 'agenda_item_requested' || input.actionType === 'information_requested' ? 'update' : 'export',
        actionId,
        actionType: input.actionType,
        status: input.status,
        caseId: input.caseId,
        localDocumentId: input.localDocumentId,
        remoteDocumentId: input.remoteDocumentId,
        targetSecurityDomain: input.targetSecurityDomain,
      }));
    });
    return actionId;
  }
}
