import type { GremiaBrProtectionClass } from '../../src/domain/models/gremia-br.model.js';
import type { GremiaBrReadContext, GremiaBrRequestOptions } from './gremiaBrTypes.js';
import { gremiaBrRecord, gremiaBrTextValue } from './gremiaBrPayload.js';

export const GREMIA_BR_PDF_MIME_TYPE = 'application/pdf';

const AGENDA_ITEM_TYPES = new Set(['INFORMATION', 'CONSULTATION', 'DECISION', 'PERSONNEL_MEASURE', 'EMPLOYER_HEARING', 'WORKS_AGREEMENT', 'ELECTION', 'REPORT', 'OTHER']);
const AGENDA_ITEM_SOURCES = new Set(['MEMBER_REQUEST', 'CHAIR', 'JAV_REQUEST', 'SBV_REQUEST', 'EMPLOYER_REQUEST', 'COMMITTEE', 'SERIES_TEMPLATE', 'CARRIED_OVER', 'PROCEDURE']);
const PROTECTION_CLASSES = new Set(['INTERNAL', 'CONFIDENTIAL', 'HIGH', 'RESTRICTED']);

export type GremiaBrWorkspaceActionAuthPort = {
  getReadContext(): GremiaBrReadContext;
  get<T>(path: string, options?: GremiaBrRequestOptions): Promise<T>;
  post<T>(path: string, options?: GremiaBrRequestOptions): Promise<T>;
};

export type RequiredGremiaBrWorkspaceContext =
  Required<Pick<GremiaBrReadContext, 'apiMode' | 'selectedBodyId' | 'selectedOrganizationId' | 'selectedSecurityDomain'>>
  & GremiaBrReadContext;

export type GeneratedDocumentRow = {
  id: string;
  title: string;
  filename: string | null;
  mime_type: string | null;
  document_kind: string | null;
  sha256: string | null;
  size_bytes: number | null;
  created_at: string;
  case_id: string | null;
  case_number: string | null;
  case_display_name: string | null;
};

export type CaseSummaryRow = {
  id: string;
  case_number: string;
  display_name: string;
  category: string;
  status: string;
  priority: string;
  opened_at: string;
  closed_at: string | null;
  summary: string | null;
  risk_level: string | null;
  first_name: string | null;
  last_name: string | null;
  organizational_unit: string | null;
  employment_state: string | null;
  protection_status: string | null;
  status_valid_until: string | null;
};

export type MeasureRow = {
  title: string;
  type: string;
  status: string;
  risk_level: string | null;
  summary: string | null;
  next_step: string | null;
  due_at: string | null;
  opened_at: string;
  closed_at: string | null;
};

export type DeadlineRow = {
  title: string;
  due_at: string;
  severity: string;
  status: string;
  legal_basis: string | null;
};

export type GremiaBrReferenceRow = {
  source_type: string;
  title: string;
  description: string | null;
};

export type DraftAgendaItem = {
  title: string;
  type: string;
  source: string;
  description?: string;
  protectionClass?: GremiaBrProtectionClass;
  timeAllocationMinutes?: number;
  itemKey?: string;
};

export type WorkspaceActionInput = {
  actionType: 'document_uploaded' | 'document_shared' | 'agenda_item_requested' | 'information_requested';
  localDocumentId?: string;
  caseId?: string;
  targetBodyId?: string;
  targetBodyName?: string;
  targetSecurityDomain?: string;
  remoteDocumentId?: string;
  remoteShareId?: string;
  remoteMeetingId?: string;
  remoteAgendaVersionId?: string;
  purpose: string;
  status: 'uploaded' | 'shared' | 'requested' | 'failed';
};

type GremiaBrUploadState =
  | 'CREATED'
  | 'QUARANTINED'
  | 'VALIDATED'
  | 'SCANNED'
  | 'ENCRYPTED'
  | 'STORED'
  | 'READY'
  | 'REJECTED'
  | 'INFECTED'
  | 'SCAN_UNAVAILABLE'
  | 'FAILED';

type GremiaBrShareStatus = 'REQUESTED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
type GremiaBrShareRequirement = 'NONE' | 'APPROVAL' | 'STEP_UP' | 'APPROVAL_AND_STEP_UP';

export type AcceptedDocumentUpload = {
  documentId: string;
  documentVersionId?: string;
  state: GremiaBrUploadState;
};

export type DocumentShareAcceptance = {
  shareId: string;
  status: 'shared' | 'requested';
  remoteStatus: GremiaBrShareStatus;
  requirement: GremiaBrShareRequirement;
};

const uploadStates = new Set<GremiaBrUploadState>([
  'CREATED',
  'QUARANTINED',
  'VALIDATED',
  'SCANNED',
  'ENCRYPTED',
  'STORED',
  'READY',
  'REJECTED',
  'INFECTED',
  'SCAN_UNAVAILABLE',
  'FAILED',
]);

const failedUploadStates = new Set<GremiaBrUploadState>(['REJECTED', 'INFECTED', 'SCAN_UNAVAILABLE', 'FAILED']);
const shareStatuses = new Set<GremiaBrShareStatus>(['REQUESTED', 'ACTIVE', 'EXPIRED', 'REVOKED']);
const shareRequirements = new Set<GremiaBrShareRequirement>(['NONE', 'APPROVAL', 'STEP_UP', 'APPROVAL_AND_STEP_UP']);

function enumText<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  return allowed.has(normalized as T) ? normalized as T : undefined;
}

export function acceptedDocumentUploadFromResponse(payload: unknown): AcceptedDocumentUpload {
  const root = gremiaBrRecord(payload);
  const state = enumText(root?.state, uploadStates);
  if (!state) throw new Error('Gremia.BR hat nach dem Dokument-Upload keinen auswertbaren Verarbeitungsstatus zurückgegeben.');

  const failureCode = optionalText(root?.failureCode);
  if (failedUploadStates.has(state)) {
    throw new Error(`Gremia.BR hat den Dokument-Upload nicht angenommen (${state}${failureCode ? `, Code ${failureCode}` : ''}).`);
  }
  if (state !== 'READY') {
    throw new Error(`Gremia.BR verarbeitet den Dokument-Upload noch (${state}). Bitte später erneut übertragen.`);
  }

  const documentId = responseId(payload, 'documentId');
  if (!documentId) throw new Error('Gremia.BR hat nach dem fertigen Dokument-Upload keine Dokument-ID zurückgegeben.');
  return {
    documentId,
    documentVersionId: responseId(payload, 'documentVersionId', 'versionId'),
    state,
  };
}

export function documentShareAcceptanceFromResponse(payload: unknown): DocumentShareAcceptance {
  const root = gremiaBrRecord(payload);
  const remoteStatus = enumText(root?.status, shareStatuses);
  const requirement = enumText(root?.requirement, shareRequirements) ?? 'NONE';
  const shareId = responseId(payload, 'shareId');
  if (!remoteStatus) throw new Error('Gremia.BR hat nach der Dokumentfreigabe keinen auswertbaren Freigabestatus zurückgegeben.');
  if (!shareId) throw new Error('Gremia.BR hat nach der Dokumentfreigabe keine Freigabe-ID zurückgegeben.');
  if (remoteStatus === 'ACTIVE') return { shareId, status: 'shared', remoteStatus, requirement };
  if (remoteStatus === 'REQUESTED') return { shareId, status: 'requested', remoteStatus, requirement };
  throw new Error(`Gremia.BR hat die Dokumentfreigabe nicht aktiviert (${remoteStatus}).`);
}

export function documentShareMessage(acceptance: DocumentShareAcceptance): string {
  if (acceptance.status === 'shared') return 'PDF wurde in Gremia.BR hochgeladen und für den gewählten Sicherheitsbereich freigegeben.';
  if (acceptance.requirement === 'APPROVAL') return 'PDF wurde in Gremia.BR hochgeladen; die Freigabe wartet dort auf Genehmigung.';
  if (acceptance.requirement === 'STEP_UP') return 'PDF wurde in Gremia.BR hochgeladen; die Freigabe wartet dort auf zusätzliche Authentifizierung.';
  if (acceptance.requirement === 'APPROVAL_AND_STEP_UP') return 'PDF wurde in Gremia.BR hochgeladen; die Freigabe wartet dort auf Genehmigung und zusätzliche Authentifizierung.';
  return 'PDF wurde in Gremia.BR hochgeladen; die Freigabe wurde dort angefordert.';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function trimRequired(value: unknown, fieldLabel: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${fieldLabel} fehlt.`);
  return text;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function boundedLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export function normalizeProtectionClass(value: unknown, fallback: GremiaBrProtectionClass): GremiaBrProtectionClass {
  return typeof value === 'string' && PROTECTION_CLASSES.has(value)
    ? value as GremiaBrProtectionClass
    : fallback;
}

export function numberOrUndefined(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Math.trunc(numeric);
}

export function responseId(payload: unknown, ...keys: string[]): string | undefined {
  const root = gremiaBrRecord(payload);
  if (!root) return undefined;
  const nested = [
    root,
    gremiaBrRecord(root.document),
    gremiaBrRecord(root.data),
    gremiaBrRecord(root.share),
    gremiaBrRecord(root.agendaVersion),
  ].filter((item): item is Record<string, unknown> => Boolean(item));
  for (const source of nested) {
    const found = gremiaBrTextValue(...keys.map((key) => source[key]), source.id, source.uuid);
    if (found) return found;
  }
  return undefined;
}

export function requireV2WorkspaceContext(context: GremiaBrReadContext): RequiredGremiaBrWorkspaceContext {
  if (context.apiMode !== 'gremia_br_v2') throw new Error('Diese Aktion benötigt eine konfigurierte Gremia.BR-2.0-Anbindung.');
  if (!context.selectedBodyId?.trim() || !context.selectedOrganizationId?.trim() || !context.selectedSecurityDomain?.trim()) {
    throw new Error('Bitte zuerst unter Einstellungen → Gremia.BR ein berechtigtes SBV-Gremium auswählen.');
  }
  return {
    ...context,
    apiMode: context.apiMode,
    selectedBodyId: context.selectedBodyId.trim(),
    selectedOrganizationId: context.selectedOrganizationId.trim(),
    selectedSecurityDomain: context.selectedSecurityDomain.trim(),
  };
}

export function existingAgendaItemFromPayload(value: unknown): DraftAgendaItem | null {
  const record = gremiaBrRecord(value);
  const title = optionalText(record?.title);
  if (!record || !title) return null;
  const type = optionalText(record.type) ?? 'OTHER';
  const source = optionalText(record.source) ?? 'CHAIR';
  if (!AGENDA_ITEM_TYPES.has(type) || !AGENDA_ITEM_SOURCES.has(source)) return null;
  return {
    title,
    type,
    source,
    description: optionalText(record.description),
    protectionClass: normalizeProtectionClass(record.protectionClass, 'INTERNAL'),
    timeAllocationMinutes: numberOrUndefined(record.timeAllocationMinutes),
    itemKey: optionalText(record.itemKey) ?? optionalText(record.id),
  };
}
