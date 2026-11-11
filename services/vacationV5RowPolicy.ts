type RowKind = keyof typeof VACATION_V5_ROW_FIELDS;

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every source column is classified as a transferable field or a local reference. */
export const VACATION_V5_ROW_FIELDS = {
  deadline: {
    table: 'deadlines', references: ['id', 'case_id', 'measure_id', 'person_id', 'process_id'], required: ['process_type', 'deadline_type', 'title', 'due_at', 'status'],
    fields: ['process_type', 'deadline_type', 'title', 'confidential_title', 'description', 'due_at', 'reminder_at', 'legal_basis', 'source_event', 'severity', 'status', 'calculation_mode', 'is_legal_deadline', 'is_user_editable', 'warning_threshold_hours', 'critical_threshold_hours', 'dashboard_from_at', 'completed_at', 'completed_note', 'cancelled_at', 'cancelled_reason', 'notes', 'created_at', 'updated_at', 'rule_key', 'source_date', 'legal_rule_version', 'original_due_at', 'manual_correction_reason'],
  },
  meeting: {
    table: 'sbv_meetings', references: ['id'], required: ['meeting_type', 'title', 'starts_at', 'status'],
    fields: ['meeting_type', 'title', 'starts_at', 'ends_at', 'location', 'invitation_received_at', 'agenda_received_at', 'attendance_status', 'status', 'notes', 'retention_until', 'created_at', 'updated_at'],
  },
  meeting_agenda: {
    table: 'sbv_meeting_agenda_items', references: ['id', 'meeting_id'], required: ['position', 'title', 'status'],
    fields: ['position', 'title', 'sbv_relevance', 'reference_scope', 'documents_status', 'own_position', 'requested_by_sbv', 'request_at', 'request_content', 'request_reaction', 'resolution_at', 'resolution_summary', 'impairment_assessment', 'significant_impairment', 'non_participation', 'suspension_requested_at', 'suspension_due_at', 'outcome', 'status', 'created_at', 'updated_at'],
  },
  recruiting: {
    table: 'recruiting_participations', references: ['id'], required: ['vacancy_title', 'status'],
    fields: ['vacancy_title', 'vacancy_reference', 'department', 'location', 'status', 'employer_notice_date', 'documents_received_date', 'documents_complete', 'has_severely_disabled_applicants', 'severely_disabled_applicant_count', 'interview_count', 'sbv_invited_to_all_known_interviews', 'sbv_participated', 'hearing_requested_date', 'hearing_due_date', 'statement_submitted_date', 'decision_known_date', 'decision_before_hearing', 'br_procedure_date', 'flagged_for_violation_review', 'violation_review_reason', 'notes', 'created_at', 'updated_at'],
  },
  recruiting_interview: {
    table: 'recruiting_interview_events', references: ['id', 'recruiting_participation_id'], required: ['interview_date', 'applicant_ref'],
    fields: ['interview_date', 'applicant_ref', 'applicant_reference_mode', 'applicant_status', 'sbv_invited', 'sbv_invitation_date', 'sbv_attended', 'accessibility_check_status', 'follow_up_needed', 'procedural_note', 'created_at', 'updated_at'],
  },
  employer_obligation: {
    table: 'sbv_employer_obligation_reviews', references: ['id'], required: ['obligation_key', 'period_year', 'status'],
    fields: ['obligation_key', 'period_year', 'scope_key', 'due_at', 'requested_at', 'received_at', 'reviewed_at', 'status', 'finding', 'next_action', 'follow_up_due_at', 'retention_until', 'created_at', 'updated_at'],
  },
  inclusion_officer: {
    table: 'sbv_inclusion_officer_snapshots', references: ['id'], required: ['status'],
    fields: ['name', 'function', 'appointed_at', 'notification_agency_at', 'notification_integration_office_at', 'verified_at', 'status', 'created_at', 'updated_at'],
  },
  inclusion_agreement: {
    table: 'sbv_inclusion_agreements', references: ['id'], required: ['title', 'status'],
    fields: ['title', 'status', 'requested_at', 'employer_response_at', 'integration_office_invited_at', 'signed_at', 'sent_agency_at', 'sent_integration_office_at', 'review_due_at', 'retention_until', 'created_at', 'updated_at'],
  },
  inclusion_topic: {
    table: 'sbv_inclusion_agreement_topics', references: ['id', 'agreement_id'], required: ['topic_key', 'status'],
    fields: ['topic_key', 'current_state', 'sbv_target', 'employer_position', 'council_position', 'result_text', 'status', 'created_at', 'updated_at'],
  },
  violation: {
    table: 'sbv_participation_violations', references: ['id', 'source_context_id', 'case_id', 'related_participation_id', 'related_case_measure_id', 'related_termination_hearing_id', 'related_deadline_id', 'related_activity_journal_entry_id', 'related_sbv_control_protocol_id', 'related_recruiting_participation_id'], required: ['stage', 'status', 'violation_type', 'source_context_type', 'subject'],
    fields: ['stage', 'status', 'violation_type', 'source_context_type', 'subject', 'measure_description', 'wrong_behavior', 'required_behavior', 'consequence_warning', 'legal_basis', 'follow_up_due_at', 'created_at', 'updated_at', 'sent_at', 'closed_at'],
  },
  violation_event: {
    table: 'sbv_participation_violation_events', references: ['id', 'violation_id'], required: ['event_type', 'created_at'],
    fields: ['event_type', 'from_status', 'to_status', 'note', 'created_at'],
  },
  assembly: {
    table: 'sbv_assemblies', references: ['id'], required: ['year', 'status'],
    fields: ['year', 'scheduled_at', 'location_or_mode', 'invitation_at', 'agenda', 'accessibility_check_status', 'materials_status', 'employer_report_status', 'minutes', 'status', 'retention_until', 'created_at', 'updated_at'],
  },
} as const;

function configuration(kind: string): (typeof VACATION_V5_ROW_FIELDS)[RowKind] {
  if (!Object.hasOwn(VACATION_V5_ROW_FIELDS, kind)) throw new Error('Unbekannter Abschnittstyp im Vertretungspaket.');
  return VACATION_V5_ROW_FIELDS[kind as RowKind];
}

export function assertVacationV5Row(kind: string, input: unknown): Record<string, string | number | boolean | null> {
  const config = configuration(kind);
  if (!record(input)) throw new Error('Ungültige Abschnittsdaten im Vertretungspaket.');
  const allowed: readonly string[] = config.fields;
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) throw new Error('Unerwartete Felder im Vertretungspaket.');
    const value = input[key];
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Ungültiger Datentyp im Vertretungspaket.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Ungültiger Datentyp im Vertretungspaket.');
  }
  if (config.required.some((key) => input[key] === undefined || input[key] === null || input[key] === '')) {
    throw new Error('Pflichtfelder im Vertretungspaket fehlen.');
  }
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 64 * 1024) throw new Error('Eine Abschnittszeile im Vertretungspaket ist zu groß.');
  return input as Record<string, string | number | boolean | null>;
}

export function projectVacationV5Row(kind: string, source: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const fields = configuration(kind).fields;
  const projected: Record<string, unknown> = {};
  for (const field of fields) if (Object.hasOwn(source, field)) projected[field] = source[field];
  return assertVacationV5Row(kind, projected);
}
