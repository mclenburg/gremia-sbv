import { type ParticipationViolationEventType, type ParticipationViolationSourceContextType, type ParticipationViolationStage, type ParticipationViolationStatus, type ParticipationViolationType, type SbvParticipationViolationEventRecord, type SbvParticipationViolationRecord } from '../src/app/core/models/sbv-participation-violation.model.js';
export const DEFAULT_LEGAL_BASIS = '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX';

export type ViolationRow = {
  id: string;
  stage: ParticipationViolationStage;
  status: ParticipationViolationStatus;
  violation_type: ParticipationViolationType;
  source_context_type: ParticipationViolationSourceContextType;
  source_context_id: string;
  case_id: string | null;
  related_participation_id: string | null;
  related_case_measure_id: string | null;
  related_termination_hearing_id: string | null;
  related_deadline_id: string | null;
  related_activity_journal_entry_id: string | null;
  related_sbv_control_protocol_id: string | null;
  related_recruiting_participation_id: string | null;
  subject: string;
  measure_description: string;
  wrong_behavior: string;
  required_behavior: string;
  consequence_warning: string | null;
  legal_basis: string | null;
  follow_up_due_at: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  closed_at: string | null;
};

export type ViolationEventRow = {
  id: string;
  violation_id: string;
  event_type: ParticipationViolationEventType;
  from_status: ParticipationViolationStatus | null;
  to_status: ParticipationViolationStatus | null;
  note: string | null;
  created_at: string;
};

export type RunResult = { changes?: number } | undefined;

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}



export function addDaysIso(base: Date, days: number): string {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString();
}

export function normalizeIso(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const valueWithTime = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T09:00:00.000Z` : text;
  const parsed = new Date(valueWithTime);
  if (Number.isNaN(parsed.getTime())) throw new Error('Datum oder Wiedervorlage ist ungültig.');
  return parsed.toISOString();
}

export function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback?: T[number]): T[number] {
  if ((allowed as readonly unknown[]).includes(value)) return value as T[number];
  if (fallback) return fallback;
  throw new Error(`Ungültiger Wert: ${String(value)}`);
}

export function mapRecord(row: ViolationRow): SbvParticipationViolationRecord {
  return {
    id: String(row.id),
    stage: row.stage as ParticipationViolationStage,
    status: row.status as ParticipationViolationStatus,
    violationType: row.violation_type as ParticipationViolationType,
    sourceContextType: row.source_context_type as ParticipationViolationSourceContextType,
    sourceContextId: String(row.source_context_id),
    caseId: row.case_id ? String(row.case_id) : undefined,
    relatedParticipationId: row.related_participation_id ? String(row.related_participation_id) : undefined,
    relatedCaseMeasureId: row.related_case_measure_id ? String(row.related_case_measure_id) : undefined,
    relatedTerminationHearingId: row.related_termination_hearing_id ? String(row.related_termination_hearing_id) : undefined,
    relatedDeadlineId: row.related_deadline_id ? String(row.related_deadline_id) : undefined,
    relatedActivityJournalEntryId: row.related_activity_journal_entry_id ? String(row.related_activity_journal_entry_id) : undefined,
    relatedSbvControlProtocolId: row.related_sbv_control_protocol_id ? String(row.related_sbv_control_protocol_id) : undefined,
    relatedRecruitingParticipationId: row.related_recruiting_participation_id ? String(row.related_recruiting_participation_id) : undefined,
    subject: String(row.subject),
    measureDescription: String(row.measure_description),
    wrongBehavior: String(row.wrong_behavior),
    requiredBehavior: String(row.required_behavior),
    consequenceWarning: row.consequence_warning ? String(row.consequence_warning) : undefined,
    legalBasis: String(row.legal_basis ?? DEFAULT_LEGAL_BASIS),
    followUpDueAt: row.follow_up_due_at ? String(row.follow_up_due_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
  };
}

export function mapEvent(row: ViolationEventRow): SbvParticipationViolationEventRecord {
  return {
    id: String(row.id),
    violationId: String(row.violation_id),
    eventType: row.event_type as ParticipationViolationEventType,
    fromStatus: row.from_status as ParticipationViolationStatus | undefined,
    toStatus: row.to_status as ParticipationViolationStatus | undefined,
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at),
  };
}

