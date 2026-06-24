export const APP_SCHEMA_VERSION = '0043';

export const DATABASE_SCHEMA_VERSION_KEY = 'database.schema.version';
export const LEGACY_DATABASE_SCHEMA_VERSION_KEY = 'settings.database.schema.version';
export const DATABASE_SCHEMA_APP_VERSION_KEY = 'database.schema.appVersion';

export const CASES_REQUIRED_COLUMNS = [
  'id',
  'case_number',
  'display_name',
  'category',
  'status',
  'protected_person_id',
  'person_binding_state',
  'privacy_review_required',
  'privacy_review_reason',
  'privacy_review_due_at',
  'handover_import_id',
  'handover_package_id',
  'handover_valid_until',
  'handover_status',
  'handover_continue_confirmed_at',
  'handover_continue_reason'
] as const;


export const CASE_DOCUMENTS_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'filename',
  'storage_path',
  'sha256',
  'extracted_text',
  'document_key',
  'iv',
  'auth_tag',
  'size_bytes',
  'imported_at',
  'extraction_quality',
  'text_extraction_status',
  'text_extracted_at',
  'text_extractor_id',
  'text_extraction_error',
  'ocr_status',
  'ocr_text',
  'ocr_engine',
  'ocr_started_at',
  'ocr_completed_at',
  'ocr_error',
  'contains_health_data',
  'created_at'
] as const;


export const CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS = [
  'id',
  'document_id',
  'case_id',
  'status',
  'attempts',
  'created_at',
  'updated_at'
] as const;

export const TERMINATION_HEARINGS_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'status',
  'termination_type',
  'protection_status',
  'received_at',
  'sbv_statement_due_at',
  'created_at',
  'updated_at'
] as const;

export const PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS = [
  'id',
  'sequence',
  'occurred_at',
  'actor',
  'action',
  'subject_type',
  'purpose',
  'previous_hash',
  'entry_hash'
] as const;

export const CASE_MEASURES_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'type',
  'title',
  'status',
  'risk_level',
  'created_from',
  'created_at',
  'updated_at',
  'handover_import_id',
  'handover_package_id',
  'handover_valid_until',
  'handover_status',
  'handover_continue_confirmed_at',
  'handover_continue_reason'
] as const;

export const CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS = [
  'measure_id',
  'employer_measure_type',
  'information_complete',
  'hearing_before_decision',
  'decision_notified',
  'created_at',
  'updated_at'
] as const;


export const CASE_MEASURE_NOTES_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'measure_type',
  'measure_id',
  'title',
  'note_at',
  'content',
  'contains_health_data',
  'confidential_level',
  'created_at',
  'updated_at'
] as const;

export const SBV_PARTICIPATION_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'title',
  'status',
  'measure_type',
  'information_complete',
  'hearing_before_decision',
  'decision_notified',
  'created_at',
  'updated_at'
] as const;

export const PROTECTED_PERSONS_REQUIRED_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'employment_state',
  'protection_status',
  'status_source',
  'lifecycle_state',
  'created_at',
  'updated_at',
  'record_kind',
  'pseudonym_label'
] as const;

export const PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS = [
  'id',
  'run_id',
  'row_number',
  'action',
  'created_at'
] as const;

export const CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS = [
  'measure_id',
  'category',
  'accommodation_status',
  'requested_adjustment',
  'legal_basis',
  'employer_response_status',
  'implementation_status',
  'created_at',
  'updated_at'
] as const;



export const GREMIA_BR_SETTINGS_REQUIRED_COLUMNS = [
  'id',
  'enabled',
  'server_url',
  'username',
  'password_secret',
  'last_connection_test_at',
  'last_successful_login_at',
  'profile_json',
  'relevance_keywords_json',
  'created_at',
  'updated_at'
] as const;



export const GREMIA_BR_CACHE_REQUIRED_COLUMNS = [
  'id',
  'cache_key',
  'source_type',
  'payload_json',
  'fetched_at',
  'created_at',
  'updated_at'
] as const;



export const CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'source_system',
  'source_type',
  'source_id',
  'title',
  'fetched_at',
  'created_at',
  'updated_at'
] as const;

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



export const SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS = [
  'id',
  'stage',
  'status',
  'violation_type',
  'source_context_type',
  'source_context_id',
  'case_id',
  'related_participation_id',
  'related_termination_hearing_id',
  'related_deadline_id',
  'related_activity_journal_entry_id',
  'related_sbv_control_protocol_id',
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
