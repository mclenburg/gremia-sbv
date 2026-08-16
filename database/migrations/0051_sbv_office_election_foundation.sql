-- Förderpfad Arbeitsplatzgestaltung (C-003).
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN funding_carrier TEXT;
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN funding_applied_at TEXT;
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN funding_documents_status TEXT;
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN funding_questions TEXT;
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN funding_decision TEXT;
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN funding_amount REAL;
ALTER TABLE case_measure_workplace_accommodation ADD COLUMN ordered_at TEXT;

-- Gremia.SBV 0.9.7-A: vollständiges Schema für fallunabhängige SBV-Amtsarbeit und örtliche SBV-Wahl.
-- Datenschutz-Leitlinie: keine individuelle Stimmentscheidung und keine Gesundheitsdetails in Wahl-Snapshots.

ALTER TABLE deadlines ADD COLUMN rule_key TEXT;
ALTER TABLE deadlines ADD COLUMN source_date TEXT;
ALTER TABLE deadlines ADD COLUMN legal_rule_version TEXT;
ALTER TABLE deadlines ADD COLUMN original_due_at TEXT;
ALTER TABLE deadlines ADD COLUMN manual_correction_reason TEXT;

CREATE TABLE IF NOT EXISTS sbv_meetings (
  id TEXT PRIMARY KEY,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('works_council','council_committee','health_safety','employer_council_meeting','works_assembly','other')),
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT,
  invitation_received_at TEXT,
  agenda_received_at TEXT,
  attendance_status TEXT NOT NULL DEFAULT 'planned',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  retention_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_meetings_starts ON sbv_meetings(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_sbv_meetings_status ON sbv_meetings(status, starts_at);

CREATE TABLE IF NOT EXISTS sbv_meeting_agenda_items (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES sbv_meetings(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  sbv_relevance INTEGER NOT NULL DEFAULT 0 CHECK (sbv_relevance IN (0,1)),
  reference_scope TEXT NOT NULL DEFAULT 'none' CHECK (reference_scope IN ('none','individual','group')),
  documents_status TEXT,
  own_position TEXT,
  requested_by_sbv INTEGER NOT NULL DEFAULT 0 CHECK (requested_by_sbv IN (0,1)),
  request_at TEXT,
  request_content TEXT,
  request_reaction TEXT,
  resolution_at TEXT,
  resolution_summary TEXT,
  impairment_assessment TEXT,
  significant_impairment INTEGER NOT NULL DEFAULT 0 CHECK (significant_impairment IN (0,1)),
  non_participation INTEGER NOT NULL DEFAULT 0 CHECK (non_participation IN (0,1)),
  suspension_requested_at TEXT,
  suspension_due_at TEXT,
  outcome TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_meeting_agenda_meeting ON sbv_meeting_agenda_items(meeting_id, position);
CREATE INDEX IF NOT EXISTS idx_sbv_meeting_agenda_suspension ON sbv_meeting_agenda_items(suspension_due_at, status);

CREATE TABLE IF NOT EXISTS sbv_assemblies (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  scheduled_at TEXT,
  location_or_mode TEXT,
  invitation_at TEXT,
  agenda TEXT,
  accessibility_check_status TEXT,
  materials_status TEXT,
  employer_report_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (employer_report_status IN ('not_requested','requested','promised','completed','not_completed')),
  minutes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  retention_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(year, id)
);
CREATE INDEX IF NOT EXISTS idx_sbv_assemblies_year ON sbv_assemblies(year, status);

CREATE TABLE IF NOT EXISTS sbv_employer_obligation_reviews (
  id TEXT PRIMARY KEY,
  obligation_key TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  scope_key TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  requested_at TEXT,
  received_at TEXT,
  reviewed_at TEXT,
  status TEXT NOT NULL DEFAULT 'not_due' CHECK (status IN ('not_due','due','requested','received','reviewing','compliant','issue_found','follow_up','closed')),
  finding TEXT,
  next_action TEXT,
  follow_up_due_at TEXT,
  retention_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(obligation_key, period_year, scope_key)
);
CREATE INDEX IF NOT EXISTS idx_sbv_obligation_reviews_status ON sbv_employer_obligation_reviews(status, due_at);
CREATE INDEX IF NOT EXISTS idx_sbv_obligation_reviews_key ON sbv_employer_obligation_reviews(obligation_key, period_year);

CREATE TABLE IF NOT EXISTS sbv_inclusion_officer_snapshots (
  id TEXT PRIMARY KEY,
  name TEXT,
  function TEXT,
  appointed_at TEXT,
  notification_agency_at TEXT,
  notification_integration_office_at TEXT,
  verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_inclusion_officer_verified ON sbv_inclusion_officer_snapshots(verified_at DESC);

CREATE TABLE IF NOT EXISTS sbv_inclusion_agreements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','negotiation_requested','negotiating','stalled','agreed','review_due','superseded')),
  requested_at TEXT,
  employer_response_at TEXT,
  integration_office_invited_at TEXT,
  signed_at TEXT,
  sent_agency_at TEXT,
  sent_integration_office_at TEXT,
  review_due_at TEXT,
  retention_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_inclusion_agreements_status ON sbv_inclusion_agreements(status, review_due_at);

CREATE TABLE IF NOT EXISTS sbv_inclusion_agreement_topics (
  id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL REFERENCES sbv_inclusion_agreements(id) ON DELETE CASCADE,
  topic_key TEXT NOT NULL,
  current_state TEXT,
  sbv_target TEXT,
  employer_position TEXT,
  council_position TEXT,
  result_text TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(agreement_id, topic_key)
);
CREATE INDEX IF NOT EXISTS idx_sbv_inclusion_agreement_topics_agreement ON sbv_inclusion_agreement_topics(agreement_id, topic_key);

CREATE TABLE IF NOT EXISTS sbv_complaint_workflows (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  received_at TEXT NOT NULL,
  assessment_status TEXT NOT NULL DEFAULT 'open',
  employer_contacted_at TEXT,
  negotiation_status TEXT,
  result_summary TEXT,
  person_informed_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_complaint_workflows_status ON sbv_complaint_workflows(status, received_at);

CREATE TABLE IF NOT EXISTS sbv_elections (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('regular','extraordinary_no_sbv','extraordinary_office_end','extraordinary_successful_challenge','deputy_by_election')),
  trigger_reason TEXT,
  procedure TEXT CHECK (procedure IN ('formal','simplified')),
  procedure_confirmed_at TEXT,
  procedure_decision_note TEXT,
  legal_rule_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','procedure_confirmed','preparation','nominations','ballots_ready','voting','counting','acceptance_pending','result_final','announced','closed','cancelled')),
  election_date TEXT,
  incumbent_term_end TEXT,
  office_term_start TEXT,
  office_term_end TEXT,
  calculated_next_regular_election_period TEXT,
  eligibility_check_date TEXT,
  eligible_disabled_employee_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_disabled_employee_count >= 0),
  minimum_threshold_met INTEGER NOT NULL DEFAULT 0 CHECK (minimum_threshold_met IN (0,1)),
  eligibility_check_basis TEXT,
  spatially_separated INTEGER NOT NULL DEFAULT 0 CHECK (spatially_separated IN (0,1)),
  eligible_count_snapshot INTEGER NOT NULL DEFAULT 0 CHECK (eligible_count_snapshot >= 0),
  deputy_count INTEGER NOT NULL DEFAULT 1 CHECK (deputy_count >= 1),
  deputy_count_locked_at TEXT,
  retention_until TEXT,
  legal_hold_status TEXT NOT NULL DEFAULT 'none' CHECK (legal_hold_status IN ('none','active','released')),
  legal_hold_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_elections_status ON sbv_elections(status, election_date);
CREATE INDEX IF NOT EXISTS idx_sbv_elections_retention ON sbv_elections(retention_until, legal_hold_status);

CREATE TABLE IF NOT EXISTS sbv_election_board_members (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  employed_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (employed_confirmed IN (0,1)),
  adult_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (adult_confirmed IN (0,1)),
  appointed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_board_members_election ON sbv_election_board_members(election_id, role);

CREATE TABLE IF NOT EXISTS sbv_election_voters (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  birth_date_optional TEXT,
  org_unit TEXT,
  eligibility_basis TEXT NOT NULL CHECK (eligibility_basis IN ('severely_disabled_confirmed','equalized_confirmed','pending_equalization_not_eligible','not_eligible_other')),
  eligibility_verified_at TEXT,
  list_status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_voters_election ON sbv_election_voters(election_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_sbv_election_voters_eligibility ON sbv_election_voters(election_id, eligibility_basis, list_status);

CREATE TABLE IF NOT EXISTS sbv_election_board_sessions (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  participants_json TEXT NOT NULL DEFAULT '[]',
  decisions_text TEXT,
  minutes_document_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_board_sessions_election ON sbv_election_board_sessions(election_id, starts_at);

CREATE TABLE IF NOT EXISTS sbv_election_candidates (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  office_type TEXT NOT NULL CHECK (office_type IN ('representative','deputy')),
  person_snapshot TEXT NOT NULL,
  birth_date TEXT,
  occupation TEXT,
  consent_at TEXT,
  eligibility_status TEXT NOT NULL DEFAULT 'unchecked',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_candidates_office ON sbv_election_candidates(election_id, office_type);

CREATE TABLE IF NOT EXISTS sbv_election_proposals (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  received_at TEXT NOT NULL,
  validity_status TEXT NOT NULL DEFAULT 'received' CHECK (validity_status IN ('received','correction_required','valid','invalid','grace_period')),
  correction_due_at TEXT,
  invalid_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_proposals_election ON sbv_election_proposals(election_id, validity_status);

CREATE TABLE IF NOT EXISTS sbv_election_proposal_candidates (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES sbv_election_proposals(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES sbv_election_candidates(id) ON DELETE CASCADE,
  office_type TEXT NOT NULL CHECK (office_type IN ('representative','deputy')),
  created_at TEXT NOT NULL,
  UNIQUE(proposal_id, candidate_id, office_type)
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_proposal_candidates_candidate ON sbv_election_proposal_candidates(candidate_id, office_type);

CREATE TABLE IF NOT EXISTS sbv_election_proposal_supporters (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES sbv_election_proposals(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES sbv_election_voters(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(proposal_id, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_supporters_voter ON sbv_election_proposal_supporters(voter_id);

CREATE TABLE IF NOT EXISTS sbv_election_objections (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  received_at TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  decision_at TEXT,
  decision TEXT,
  notified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_objections_election ON sbv_election_objections(election_id, received_at);

CREATE TABLE IF NOT EXISTS sbv_election_mail_ballots (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES sbv_election_voters(id) ON DELETE CASCADE,
  requested_at TEXT,
  sent_at TEXT,
  received_at TEXT,
  declaration_valid INTEGER CHECK (declaration_valid IN (0,1)),
  transferred_to_urn_at TEXT,
  late_received_at TEXT,
  destroy_due_at TEXT,
  destroyed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(election_id, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_mail_ballots_election ON sbv_election_mail_ballots(election_id, received_at);

CREATE TABLE IF NOT EXISTS sbv_election_vote_totals (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  office_type TEXT NOT NULL CHECK (office_type IN ('representative','deputy')),
  candidate_id TEXT NOT NULL REFERENCES sbv_election_candidates(id) ON DELETE CASCADE,
  votes INTEGER NOT NULL CHECK (votes >= 0),
  rank INTEGER CHECK (rank IS NULL OR rank >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(election_id, office_type, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_vote_totals_rank ON sbv_election_vote_totals(election_id, office_type, rank);

CREATE TABLE IF NOT EXISTS sbv_election_results (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  office_type TEXT NOT NULL CHECK (office_type IN ('representative','deputy')),
  candidate_id TEXT NOT NULL REFERENCES sbv_election_candidates(id) ON DELETE CASCADE,
  elected_rank INTEGER CHECK (elected_rank IS NULL OR elected_rank >= 1),
  lot_required INTEGER NOT NULL DEFAULT 0 CHECK (lot_required IN (0,1)),
  lot_decided_at TEXT,
  notified_at TEXT,
  response_due_at TEXT,
  acceptance_status TEXT NOT NULL DEFAULT 'pending' CHECK (acceptance_status IN ('pending','accepted_by_silence','accepted_explicit','rejected','replaced')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(election_id, office_type, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_results_election ON sbv_election_results(election_id, office_type, elected_rank);

CREATE TABLE IF NOT EXISTS sbv_election_events (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  actor_role TEXT,
  metadata_json_datensparsam TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_events_election ON sbv_election_events(election_id, occurred_at);

CREATE TABLE IF NOT EXISTS sbv_workflow_document_links (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('election','meeting','assembly','inclusion_agreement','employer_obligation_review')),
  owner_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  document_class TEXT NOT NULL DEFAULT 'generated_document' CHECK (document_class IN ('generated_document','scanned_copy','external_document','original_physical_reference')),
  template_version TEXT,
  legal_rule_version TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(owner_type, owner_id, document_id, purpose)
);
CREATE INDEX IF NOT EXISTS idx_sbv_workflow_document_links_owner ON sbv_workflow_document_links(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_sbv_workflow_document_links_document ON sbv_workflow_document_links(document_id);

CREATE TABLE IF NOT EXISTS sbv_election_physical_records (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  storage_location TEXT,
  sealed_status TEXT,
  original_required INTEGER NOT NULL DEFAULT 1 CHECK (original_required IN (0,1)),
  handed_over_at TEXT,
  handed_over_to TEXT,
  notes_minimal TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_physical_records_election ON sbv_election_physical_records(election_id, record_type);

CREATE TABLE IF NOT EXISTS sbv_election_archive_exports (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL REFERENCES sbv_elections(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf_bundle','transfer_container')),
  format_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),
  destination_path_metadata_minimal TEXT
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_archive_exports_election ON sbv_election_archive_exports(election_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sbv_election_transfer_imports (
  id TEXT PRIMARY KEY,
  source_package_id TEXT NOT NULL UNIQUE,
  imported_at TEXT NOT NULL,
  format_version INTEGER NOT NULL,
  source_vault_id_hash TEXT NOT NULL,
  source_manifest_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('prepared','exported','inspected','imported','rejected','superseded')),
  imported_election_id TEXT REFERENCES sbv_elections(id) ON DELETE SET NULL,
  metadata_json_minimal TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_transfer_imports_election ON sbv_election_transfer_imports(imported_election_id, imported_at);

CREATE TABLE IF NOT EXISTS sbv_election_transfer_import_items (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES sbv_election_transfer_imports(id) ON DELETE CASCADE,
  package_ref TEXT NOT NULL,
  local_entity_type TEXT NOT NULL,
  local_entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(import_id, package_ref)
);
CREATE INDEX IF NOT EXISTS idx_sbv_election_transfer_import_items_local ON sbv_election_transfer_import_items(local_entity_type, local_entity_id);

CREATE TABLE IF NOT EXISTS sbv_retention_legal_holds (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('case','election','meeting','assembly','inclusion_agreement','employer_obligation_review')),
  owner_id TEXT NOT NULL,
  reason_key TEXT NOT NULL,
  legal_reference TEXT,
  starts_at TEXT NOT NULL,
  until_at TEXT,
  released_at TEXT,
  release_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sbv_retention_legal_holds_owner ON sbv_retention_legal_holds(owner_type, owner_id, released_at);
CREATE INDEX IF NOT EXISTS idx_sbv_retention_legal_holds_until ON sbv_retention_legal_holds(until_at, released_at);
