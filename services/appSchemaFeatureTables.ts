export const CASE_SEARCH_INDEX_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'source_type',
  'source_id',
  'source_label',
  'title',
  'content',
  'updated_at',
  'confidentiality',
  'contains_health_data',
  'extraction_quality',
  'navigation_kind',
  'navigation_id'
] as const;

export const CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS = [
  'case_id',
  'indexed_at',
  'last_source_updated_at',
  'source_count',
  'updated_at'
] as const;


export const CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS = [
  'id',
  'package_id',
  'imported_at',
  'valid_until',
  'status',
  'mode',
  'created_case_count',
  'updated_case_count',
  'metadata_json'
] as const;

export const CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS = [
  'id',
  'handover_import_id',
  'local_entity_type',
  'local_entity_id',
  'package_ref',
  'created_at'
] as const;


export const SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS = [
  'id',
  'kind',
  'title',
  'legal_basis',
  'started_at',
  'ended_at',
  'provider',
  'participants',
  'task_context',
  'necessity_reason',
  'employer_reaction',
  'cost_note',
  'status',
  'notes',
  'created_at',
  'updated_at'
] as const;


export const SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS = [
  'id',
  'title',
  'partner',
  'topic',
  'meeting_at',
  'participants',
  'legal_context',
  'discussion',
  'result',
  'next_steps',
  'follow_up_due_at',
  'status',
  'created_at',
  'updated_at'
] as const;


export const COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS = [
  'id',
  'occurred_at',
  'discovered_at',
  'category',
  'risk_level',
  'status',
  'summary',
  'affected_data_categories',
  'immediate_measures',
  'dsb_notified_at',
  'authority_notification_checked',
  'data_subjects_informed_at',
  'closed_at',
  'lessons_learned',
  'created_at',
  'updated_at'
] as const;

export const ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS = [
  'id',
  'entry_date',
  'started_at',
  'ended_at',
  'duration_minutes',
  'time_mode',
  'category',
  'title',
  'description',
  'result_note',
  'confidentiality_level',
  'status',
  'created_from',
  'follow_up_due_at',
  'performed_outside_contract_work_time',
  'exported_for_activity_report_at',
  'created_at',
  'updated_at'
] as const;

export const ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS = [
  'id',
  'entry_id',
  'target_type',
  'target_id',
  'created_at'
] as const;

export const ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS = [
  'context_type',
  'category',
  'updated_at'
] as const;




export const RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS = [
  'id',
  'vacancy_title',
  'vacancy_reference',
  'department',
  'location',
  'status',
  'employer_notice_date',
  'documents_received_date',
  'documents_complete',
  'has_severely_disabled_applicants',
  'severely_disabled_applicant_count',
  'interview_count',
  'sbv_invited_to_all_known_interviews',
  'sbv_participated',
  'hearing_requested_date',
  'hearing_due_date',
  'statement_submitted_date',
  'decision_known_date',
  'decision_before_hearing',
  'br_procedure_date',
  'flagged_for_violation_review',
  'violation_review_reason',
  'notes',
  'created_at',
  'updated_at'
] as const;

export const RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS = [
  'id',
  'recruiting_participation_id',
  'interview_date',
  'applicant_ref',
  'applicant_reference_mode',
  'applicant_status',
  'sbv_invited',
  'sbv_invitation_date',
  'sbv_attended',
  'accessibility_check_status',
  'follow_up_needed',
  'procedural_note',
  'created_at',
  'updated_at'
] as const;

export const SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS = [
  'id',
  'stage',
  'status',
  'violation_type',
  'source_context_type',
  'source_context_id',
  'case_id',
  'related_participation_id',
  'related_case_measure_id',
  'related_termination_hearing_id',
  'related_deadline_id',
  'related_activity_journal_entry_id',
  'related_sbv_control_protocol_id',
  'related_recruiting_participation_id',
  'subject',
  'measure_description',
  'wrong_behavior',
  'required_behavior',
  'consequence_warning',
  'legal_basis',
  'follow_up_due_at',
  'created_at',
  'updated_at',
  'sent_at',
  'closed_at'
] as const;

export const SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS = [
  'id',
  'violation_id',
  'event_type',
  'from_status',
  'to_status',
  'note',
  'created_at'
] as const;

export const SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS = [
  'id',
  'violation_id',
  'document_id',
  'stage',
  'template_key',
  'template_version',
  'immutable_snapshot',
  'created_at'
] as const;

export const GENERATED_DOCUMENTS_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'template_id',
  'violation_id',
  'document_kind',
  'template_version',
  'title',
  'storage_path',
  'filename',
  'mime_type',
  'sha256',
  'document_key',
  'iv',
  'auth_tag',
  'size_bytes',
  'created_at'
] as const;
