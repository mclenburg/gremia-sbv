import type { DatabaseAdapter } from './databaseService.js';
import type { DataSubjectAccessPrefillCase, DataSubjectAccessPrefillDeadline, DataSubjectAccessPrefillImportRun, DataSubjectAccessPrefillLifecycleEvent, DataSubjectAccessPrefillMeasure, DataSubjectAccessPrefillPerson, DataSubjectAccessRequestInput } from '../src/domain/models/compliance.model.js';
/** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
export type DatabaseScalar = string;
export type DatabaseRow = Record<string, DatabaseScalar>;

export function nowIso(): string {
  return new Date().toISOString();
}

export function optional(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text.length ? text : undefined;
}

export function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function hasTable(db: DatabaseAdapter, name: string): boolean {
  try {
    const row = db.prepare<DatabaseRow>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

export function parseChangedFields(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function rawTokens(value: unknown): string[] {
  return String(value ?? '')
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function searchTokens(input: DataSubjectAccessRequestInput): string[] {
  return unique([...rawTokens(input.requesterName), ...rawTokens(input.caseReference)]);
}

export function nameTokens(input: DataSubjectAccessRequestInput): string[] {
  return unique(rawTokens(input.requesterName));
}

export function nameVariants(input: DataSubjectAccessRequestInput): string[] {
  const parts = rawTokens(input.requesterName);
  const variants = [input.requesterName.trim()];
  if (parts.length >= 2) {
    variants.push(parts.join(' '));
    variants.push([...parts].reverse().join(' '));
    variants.push(parts[0]);
    variants.push(parts[parts.length - 1]);
  } else {
    variants.push(...parts);
  }
  return unique(variants.map((value) => value.trim()).filter((value) => value.length >= 2));
}

export function allSearchTerms(input: DataSubjectAccessRequestInput): string[] {
  return unique([
    ...nameVariants(input),
    ...searchTokens(input),
  ]);
}

export function placeholders(values: string[]): string {
  return values.map(() => '?').join(', ');
}

export function textOf(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((column) => row[column]).filter((value) => value !== undefined && value !== null).join(' ');
}

export function matchedTermsIn(text: string, terms: string[]): string[] {
  const normalizedText = normalize(text);
  return terms.filter((term) => normalizedText.includes(normalize(term)));
}

export function excerpt(text: string, terms: string[], fallback = '—'): string {
  const normalizedText = normalize(text);
  const first = terms
    .map((term) => normalizedText.indexOf(normalize(term)))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, first - 90);
  const end = Math.min(text.length, first + 210);
  const slice = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (!slice) return fallback;
  return `${start > 0 ? '…' : ''}${slice}${end < text.length ? '…' : ''}`;
}

export function mapPerson(row: DatabaseRow): DataSubjectAccessPrefillPerson {
  const displayName = row.record_kind === 'pseudonymous_request'
    ? row.pseudonym_label || 'Pseudonyme Anfrage'
    : `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  return {
    id: row.id,
    displayName,
    recordKind: optional(row.record_kind),
    personnelNumber: optional(row.personnel_number),
    workEmail: optional(row.work_email),
    organizationalUnit: optional(row.organizational_unit),
    location: optional(row.location),
    protectionStatus: optional(row.protection_status),
    employmentState: optional(row.employment_state),
    lifecycleState: optional(row.lifecycle_state),
    statusValidFrom: optional(row.status_valid_from),
    statusValidUntil: optional(row.status_valid_until),
    evidenceCheckedAt: optional(row.evidence_checked_at),
    retentionReviewAt: optional(row.retention_review_at),
    anonymizedAt: optional(row.anonymized_at),
  };
}

export function mapLegacyPerson(row: DatabaseRow): DataSubjectAccessPrefillPerson {
  return {
    id: row.id,
    displayName: row.display_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    recordKind: 'legacy_person',
    workEmail: optional(row.email),
    organizationalUnit: optional(row.department),
    protectionStatus: optional(row.sb_status),
    statusValidUntil: optional(row.valid_until),
  };
}

export function mapCase(row: DatabaseRow): DataSubjectAccessPrefillCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    displayName: row.display_name,
    category: row.category,
    status: row.status,
    priority: row.priority,
    openedAt: row.opened_at,
    closedAt: optional(row.closed_at),
    privacyReviewRequired: Boolean(row.privacy_review_required),
  };
}

export function mapDeadline(row: DatabaseRow): DataSubjectAccessPrefillDeadline {
  return {
    id: row.id,
    title: row.confidential_title || row.title,
    processType: row.process_type,
    deadlineType: row.deadline_type,
    status: row.status,
    severity: row.severity,
    dueAt: row.due_at,
    caseId: optional(row.case_id),
    measureId: optional(row.measure_id),
    legalBasis: optional(row.legal_basis),
  };
}

export function mapMeasure(row: DatabaseRow): DataSubjectAccessPrefillMeasure {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.type,
    title: row.title,
    status: row.status,
    riskLevel: row.risk_level,
    openedAt: row.opened_at,
    dueAt: optional(row.due_at),
    closedAt: optional(row.closed_at),
    requiresFollowUp: Boolean(row.requires_follow_up),
  };
}

export function mapImport(row: DatabaseRow): DataSubjectAccessPrefillImportRun {
  return {
    id: row.id,
    sourceFileName: row.source_file_name,
    importedAt: row.imported_at,
    action: row.action,
    changedFields: parseChangedFields(row.changed_fields_json),
  };
}

export function mapLifecycle(row: DatabaseRow): DataSubjectAccessPrefillLifecycleEvent {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    action: row.action,
    subjectType: row.subject_type,
    subjectId: optional(row.subject_id),
    caseId: optional(row.case_id),
    purpose: row.purpose,
  };
}

export interface FreeTextSource {
  table: string;
  sourceType: string;
  sourceLabel: string;
  idColumn: string;
  titleColumn?: string;
  caseIdColumn?: string;
  dateColumn?: string;
  textColumns: string[];
  joinCase?: boolean;
  linkVia?: 'measure' | 'bem_process' | 'prevention_process' | 'sbv_participation';
}

export function linkedCaseExpression(source: FreeTextSource): string {
  if (source.caseIdColumn) return `t.${source.caseIdColumn}`;
  if (source.linkVia === 'measure') return 'cm.case_id';
  if (source.linkVia === 'bem_process') return 'bp.case_id';
  if (source.linkVia === 'prevention_process') return 'pp.case_id';
  if (source.linkVia === 'sbv_participation') return 'sp.case_id';
  return 'NULL';
}

export function linkedCaseJoin(source: FreeTextSource): string {
  if (source.joinCase && source.caseIdColumn) return `LEFT JOIN cases c ON c.id = t.${source.caseIdColumn}`;
  if (source.linkVia === 'measure') return 'LEFT JOIN case_measures cm ON cm.id = t.measure_id LEFT JOIN cases c ON c.id = cm.case_id';
  if (source.linkVia === 'bem_process') return 'LEFT JOIN bem_processes bp ON bp.id = t.process_id LEFT JOIN cases c ON c.id = bp.case_id';
  if (source.linkVia === 'prevention_process') return 'LEFT JOIN prevention_processes pp ON pp.id = t.process_id LEFT JOIN cases c ON c.id = pp.case_id';
  if (source.linkVia === 'sbv_participation') return 'LEFT JOIN sbv_participations sp ON sp.id = t.participation_id LEFT JOIN cases c ON c.id = sp.case_id';
  return '';
}

export function hasLinkedCase(source: FreeTextSource): boolean {
  return Boolean(source.caseIdColumn || source.linkVia);
}


export const FREE_TEXT_SOURCES: FreeTextSource[] = [
  { table: 'cases', sourceType: 'case', sourceLabel: 'Fallakte', idColumn: 'id', titleColumn: 'display_name', caseIdColumn: 'id', dateColumn: 'opened_at', textColumns: ['case_number', 'display_name', 'summary', 'privacy_review_reason'] },
  { table: 'case_notes', sourceType: 'case_note', sourceLabel: 'Fallnotiz', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'note_date', textColumns: ['title', 'participants', 'content', 'next_steps'], joinCase: true },
  { table: 'case_measure_notes', sourceType: 'case_measure_note', sourceLabel: 'Maßnahmen-/Prozessnotiz', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'note_at', textColumns: ['title', 'participants', 'content', 'next_steps'], joinCase: true },
  { table: 'case_documents', sourceType: 'case_document', sourceLabel: 'Dokumenttext/OCR', idColumn: 'id', titleColumn: 'display_title', caseIdColumn: 'case_id', dateColumn: 'imported_at', textColumns: ['filename', 'display_title', 'extracted_text', 'ocr_text', 'text_extraction_error', 'ocr_error'], joinCase: true },
  { table: 'case_measures', sourceType: 'case_measure', sourceLabel: 'Maßnahme', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'opened_at', textColumns: ['title', 'summary', 'next_step'], joinCase: true },
  { table: 'case_measure_participation', sourceType: 'participation_measure', sourceLabel: 'SBV-Beteiligungsmaßnahme', idColumn: 'measure_id', titleColumn: 'employer_measure_type', textColumns: ['employer_measure_type', 'person_status', 'decision_stage', 'violation_summary', 'sbv_position'], linkVia: 'measure' },
  { table: 'case_measure_workplace_accommodation', sourceType: 'workplace_accommodation', sourceLabel: 'Arbeitsplatzanpassung', idColumn: 'measure_id', titleColumn: 'category', textColumns: ['category', 'requested_adjustment', 'legal_basis', 'barrier_or_limitation', 'workplace_context', 'proposed_solution', 'outcome'], linkVia: 'measure' },
  { table: 'case_measure_events', sourceType: 'case_measure_event', sourceLabel: 'Maßnahmenereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'measure' },
  { table: 'bem_processes', sourceType: 'bem_process', sourceLabel: 'BEM-Verfahren', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['title', 'trigger_description', 'consent_scope', 'data_retention_note', 'participants', 'measures', 'measure_owners', 'result', 'completion_reason', 'confidential_notes'], joinCase: true },
  { table: 'bem_process_events', sourceType: 'bem_event', sourceLabel: 'BEM-Ereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'bem_process' },
  { table: 'prevention_processes', sourceType: 'prevention_process', sourceLabel: 'Präventionsverfahren', idColumn: 'id', titleColumn: 'difficulty_type', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['difficulty_type', 'risk_type', 'person_status', 'hazard_description', 'employer_request_summary', 'measures', 'result'], joinCase: true },
  { table: 'prevention_process_events', sourceType: 'prevention_event', sourceLabel: 'Präventionsereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'prevention_process' },
  { table: 'equalization_processes', sourceType: 'equalization_process', sourceLabel: 'Gleichstellungs-/GdB-Vorgang', idColumn: 'id', titleColumn: 'application_status', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['application_status', 'agency_reference', 'outcome', 'notes'], joinCase: true },
  { table: 'termination_hearings', sourceType: 'termination_hearing', sourceLabel: 'Kündigungsanhörung', idColumn: 'id', titleColumn: 'termination_type', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['termination_type', 'protection_status', 'employer_reason', 'missing_information', 'sbv_assessment', 'statement'], joinCase: true },
  { table: 'sbv_participations', sourceType: 'sbv_participation', sourceLabel: 'SBV-Beteiligungsmonitor', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['title', 'measure_type', 'person_status', 'decision_stage', 'violation_summary', 'sbv_position', 'next_step'], joinCase: true },
  { table: 'sbv_participation_events', sourceType: 'sbv_participation_event', sourceLabel: 'SBV-Beteiligungsereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'sbv_participation' },
  { table: 'contact_text_references', sourceType: 'contact_text_reference', sourceLabel: 'Kontakt-Freitextreferenz', idColumn: 'id', titleColumn: 'source_table', dateColumn: 'created_at', textColumns: ['source_table', 'source_column', 'excerpt'] },
  { table: 'case_search_index', sourceType: 'case_search_index', sourceLabel: 'Suchindex-Fundstelle', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'occurred_at', textColumns: ['source_label', 'title', 'content', 'keywords'], joinCase: true },
];
