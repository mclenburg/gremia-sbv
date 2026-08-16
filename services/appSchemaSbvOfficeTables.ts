export const SBV_MEETINGS_REQUIRED_COLUMNS = [
  'id', 'meeting_type', 'title', 'starts_at', 'location', 'invitation_received_at',
  'agenda_received_at', 'attendance_status', 'status', 'notes', 'retention_until',
  'created_at', 'updated_at',
] as const;

export const SBV_MEETING_AGENDA_ITEMS_REQUIRED_COLUMNS = [
  'id', 'meeting_id', 'position', 'title', 'sbv_relevance', 'reference_scope',
  'documents_status', 'own_position', 'requested_by_sbv', 'request_at', 'request_content',
  'request_reaction', 'resolution_at', 'resolution_summary', 'impairment_assessment',
  'significant_impairment', 'non_participation', 'suspension_requested_at',
  'suspension_due_at', 'outcome', 'status', 'created_at', 'updated_at',
] as const;

export const SBV_ASSEMBLIES_REQUIRED_COLUMNS = [
  'id', 'year', 'scheduled_at', 'location_or_mode', 'invitation_at', 'agenda',
  'accessibility_check_status', 'materials_status', 'employer_report_status', 'minutes',
  'status', 'retention_until', 'created_at', 'updated_at',
] as const;

export const SBV_EMPLOYER_OBLIGATION_REVIEWS_REQUIRED_COLUMNS = [
  'id', 'obligation_key', 'period_year', 'scope_key', 'due_at', 'requested_at',
  'received_at', 'reviewed_at', 'status', 'finding', 'next_action', 'follow_up_due_at',
  'retention_until', 'created_at', 'updated_at',
] as const;

export const SBV_INCLUSION_OFFICER_SNAPSHOTS_REQUIRED_COLUMNS = [
  'id', 'name', 'function', 'appointed_at', 'notification_agency_at',
  'notification_integration_office_at', 'verified_at', 'status', 'created_at', 'updated_at',
] as const;

export const SBV_INCLUSION_AGREEMENTS_REQUIRED_COLUMNS = [
  'id', 'title', 'status', 'requested_at', 'employer_response_at',
  'integration_office_invited_at', 'signed_at', 'sent_agency_at',
  'sent_integration_office_at', 'review_due_at', 'retention_until', 'created_at', 'updated_at',
] as const;

export const SBV_INCLUSION_AGREEMENT_TOPICS_REQUIRED_COLUMNS = [
  'id', 'agreement_id', 'topic_key', 'current_state', 'sbv_target', 'employer_position',
  'council_position', 'result_text', 'status', 'created_at', 'updated_at',
] as const;

export const SBV_COMPLAINT_WORKFLOWS_REQUIRED_COLUMNS = [
  'id', 'case_id', 'received_at', 'assessment_status', 'employer_contacted_at',
  'negotiation_status', 'result_summary', 'person_informed_at', 'status', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTIONS_REQUIRED_COLUMNS = [
  'id', 'kind', 'trigger_reason', 'procedure', 'procedure_confirmed_at',
  'procedure_decision_note', 'legal_rule_version', 'status', 'election_date',
  'incumbent_term_end', 'office_term_start', 'office_term_end',
  'calculated_next_regular_election_period', 'eligibility_check_date',
  'eligible_disabled_employee_count', 'minimum_threshold_met', 'eligibility_check_basis',
  'spatially_separated', 'eligible_count_snapshot', 'deputy_count', 'deputy_count_locked_at',
  'retention_until', 'legal_hold_status', 'legal_hold_reason', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_BOARD_MEMBERS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'role', 'name', 'employed_confirmed', 'adult_confirmed',
  'appointed_at', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_VOTERS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'last_name', 'first_name', 'birth_date_optional', 'org_unit',
  'eligibility_basis', 'eligibility_verified_at', 'list_status', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_BOARD_SESSIONS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'starts_at', 'participants_json', 'decisions_text',
  'minutes_document_id', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_CANDIDATES_REQUIRED_COLUMNS = [
  'id', 'election_id', 'office_type', 'person_snapshot', 'birth_date', 'occupation',
  'consent_at', 'eligibility_status', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_PROPOSALS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'received_at', 'validity_status', 'correction_due_at',
  'invalid_reason', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_PROPOSAL_CANDIDATES_REQUIRED_COLUMNS = [
  'id', 'proposal_id', 'candidate_id', 'office_type', 'created_at',
] as const;

export const SBV_ELECTION_PROPOSAL_SUPPORTERS_REQUIRED_COLUMNS = [
  'id', 'proposal_id', 'voter_id', 'created_at',
] as const;

export const SBV_ELECTION_OBJECTIONS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'received_at', 'subject_ref', 'decision_at', 'decision',
  'notified_at', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_MAIL_BALLOTS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'voter_id', 'requested_at', 'sent_at', 'received_at',
  'declaration_valid', 'transferred_to_urn_at', 'late_received_at', 'destroy_due_at',
  'destroyed_at', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_VOTE_TOTALS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'office_type', 'candidate_id', 'votes', 'rank', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_RESULTS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'office_type', 'candidate_id', 'elected_rank', 'lot_required',
  'lot_decided_at', 'notified_at', 'response_due_at', 'acceptance_status', 'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_EVENTS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'event_type', 'occurred_at', 'actor_role',
  'metadata_json_datensparsam', 'created_at',
] as const;

export const SBV_WORKFLOW_DOCUMENT_LINKS_REQUIRED_COLUMNS = [
  'id', 'owner_type', 'owner_id', 'document_id', 'purpose', 'document_class', 'template_version', 'legal_rule_version', 'created_at',
] as const;

export const SBV_ELECTION_PHYSICAL_RECORDS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'record_type', 'description', 'quantity', 'storage_location',
  'sealed_status', 'original_required', 'handed_over_at', 'handed_over_to', 'notes_minimal',
  'created_at', 'updated_at',
] as const;

export const SBV_ELECTION_ARCHIVE_EXPORTS_REQUIRED_COLUMNS = [
  'id', 'election_id', 'export_type', 'format_version', 'created_at', 'manifest_hash',
  'file_count', 'destination_path_metadata_minimal',
] as const;

export const SBV_ELECTION_TRANSFER_IMPORTS_REQUIRED_COLUMNS = [
  'id', 'source_package_id', 'imported_at', 'format_version', 'source_vault_id_hash',
  'source_manifest_hash', 'status', 'imported_election_id', 'metadata_json_minimal',
] as const;

export const SBV_ELECTION_TRANSFER_IMPORT_ITEMS_REQUIRED_COLUMNS = [
  'id', 'import_id', 'package_ref', 'local_entity_type', 'local_entity_id', 'created_at',
] as const;

export const SBV_RETENTION_LEGAL_HOLDS_REQUIRED_COLUMNS = [
  'id', 'owner_type', 'owner_id', 'reason_key', 'legal_reference', 'starts_at', 'until_at',
  'released_at', 'release_reason', 'created_at', 'updated_at',
] as const;

export const DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS = [
  'rule_key', 'source_date', 'legal_rule_version', 'original_due_at', 'manual_correction_reason',
] as const;

export const SBV_OFFICE_0051_REQUIRED_TABLES = {
  sbv_meetings: SBV_MEETINGS_REQUIRED_COLUMNS,
  sbv_meeting_agenda_items: SBV_MEETING_AGENDA_ITEMS_REQUIRED_COLUMNS,
  sbv_assemblies: SBV_ASSEMBLIES_REQUIRED_COLUMNS,
  sbv_employer_obligation_reviews: SBV_EMPLOYER_OBLIGATION_REVIEWS_REQUIRED_COLUMNS,
  sbv_inclusion_officer_snapshots: SBV_INCLUSION_OFFICER_SNAPSHOTS_REQUIRED_COLUMNS,
  sbv_inclusion_agreements: SBV_INCLUSION_AGREEMENTS_REQUIRED_COLUMNS,
  sbv_inclusion_agreement_topics: SBV_INCLUSION_AGREEMENT_TOPICS_REQUIRED_COLUMNS,
  sbv_complaint_workflows: SBV_COMPLAINT_WORKFLOWS_REQUIRED_COLUMNS,
  sbv_elections: SBV_ELECTIONS_REQUIRED_COLUMNS,
  sbv_election_board_members: SBV_ELECTION_BOARD_MEMBERS_REQUIRED_COLUMNS,
  sbv_election_voters: SBV_ELECTION_VOTERS_REQUIRED_COLUMNS,
  sbv_election_board_sessions: SBV_ELECTION_BOARD_SESSIONS_REQUIRED_COLUMNS,
  sbv_election_candidates: SBV_ELECTION_CANDIDATES_REQUIRED_COLUMNS,
  sbv_election_proposals: SBV_ELECTION_PROPOSALS_REQUIRED_COLUMNS,
  sbv_election_proposal_candidates: SBV_ELECTION_PROPOSAL_CANDIDATES_REQUIRED_COLUMNS,
  sbv_election_proposal_supporters: SBV_ELECTION_PROPOSAL_SUPPORTERS_REQUIRED_COLUMNS,
  sbv_election_objections: SBV_ELECTION_OBJECTIONS_REQUIRED_COLUMNS,
  sbv_election_mail_ballots: SBV_ELECTION_MAIL_BALLOTS_REQUIRED_COLUMNS,
  sbv_election_vote_totals: SBV_ELECTION_VOTE_TOTALS_REQUIRED_COLUMNS,
  sbv_election_results: SBV_ELECTION_RESULTS_REQUIRED_COLUMNS,
  sbv_election_events: SBV_ELECTION_EVENTS_REQUIRED_COLUMNS,
  sbv_workflow_document_links: SBV_WORKFLOW_DOCUMENT_LINKS_REQUIRED_COLUMNS,
  sbv_election_physical_records: SBV_ELECTION_PHYSICAL_RECORDS_REQUIRED_COLUMNS,
  sbv_election_archive_exports: SBV_ELECTION_ARCHIVE_EXPORTS_REQUIRED_COLUMNS,
  sbv_election_transfer_imports: SBV_ELECTION_TRANSFER_IMPORTS_REQUIRED_COLUMNS,
  sbv_election_transfer_import_items: SBV_ELECTION_TRANSFER_IMPORT_ITEMS_REQUIRED_COLUMNS,
  sbv_retention_legal_holds: SBV_RETENTION_LEGAL_HOLDS_REQUIRED_COLUMNS,
} as const;
