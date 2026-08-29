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
