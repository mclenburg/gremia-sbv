PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT NOT NULL,
  department TEXT,
  email TEXT,
  phone TEXT,
  sb_status TEXT CHECK (sb_status IN ('schwerbehindert', 'gleichgestellt', 'beantragt', 'unbekannt')) DEFAULT 'unbekannt',
  gdb INTEGER,
  marks TEXT,
  valid_until TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL UNIQUE,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen',
  priority TEXT NOT NULL DEFAULT 'normal',
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  summary TEXT,
  risk_level TEXT DEFAULT 'normal',
  is_pseudonymized INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,
  review_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
  person_binding_state TEXT NOT NULL DEFAULT 'legacy_unlinked' CHECK (person_binding_state IN ('active','migrated','legacy_unlinked','anonymous_request','anonymized','person_deleted','unlinking_in_progress')),
  privacy_review_required INTEGER NOT NULL DEFAULT 0,
  privacy_review_reason TEXT,
  privacy_review_due_at TEXT,
  privacy_review_priority TEXT NOT NULL DEFAULT 'normal',
  anonymization_recommended INTEGER NOT NULL DEFAULT 0,
  anonymized_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cases_protected_person ON cases(protected_person_id);
CREATE INDEX IF NOT EXISTS idx_cases_person_binding_state ON cases(person_binding_state);
CREATE INDEX IF NOT EXISTS idx_cases_privacy_review ON cases(privacy_review_required, privacy_review_due_at);

CREATE TABLE IF NOT EXISTS case_notes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Gesprächsnotiz',
  note_date TEXT NOT NULL,
  note_type TEXT NOT NULL,
  participants TEXT,
  content TEXT NOT NULL,
  next_steps TEXT,
  contains_health_data INTEGER NOT NULL DEFAULT 0,
  confidential_level TEXT NOT NULL DEFAULT 'sensibel',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_note_cases (
  note_id TEXT NOT NULL REFERENCES case_notes(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (note_id, case_id)
);


CREATE TABLE IF NOT EXISTS case_note_links (
  id TEXT PRIMARY KEY,
  case_note_id TEXT NOT NULL REFERENCES case_notes(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('bem', 'participation', 'deadline')),
  target_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  accessible_label TEXT NOT NULL,
  text_start INTEGER NOT NULL DEFAULT 0,
  text_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  display_title TEXT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  extracted_text TEXT,
  document_key TEXT,
  iv TEXT,
  auth_tag TEXT,
  size_bytes INTEGER,
  imported_at TEXT,
  extraction_quality TEXT NOT NULL DEFAULT 'unknown',
  text_extraction_status TEXT NOT NULL DEFAULT 'unknown',
  text_extracted_at TEXT,
  text_extractor_id TEXT,
  text_extraction_error TEXT,
  ocr_status TEXT NOT NULL DEFAULT 'not_required' CHECK (ocr_status IN ('not_required','queued','processing','completed','unsupported','failed')),
  ocr_text TEXT,
  ocr_engine TEXT,
  ocr_started_at TEXT,
  ocr_completed_at TEXT,
  ocr_error TEXT,
  contains_health_data INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS case_document_ocr_jobs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES case_documents(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','unsupported','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  process_id TEXT,
  process_type TEXT NOT NULL DEFAULT 'case',
  deadline_type TEXT NOT NULL DEFAULT 'follow_up',
  title TEXT NOT NULL,
  confidential_title TEXT,
  description TEXT,
  due_at TEXT NOT NULL,
  reminder_at TEXT,
  legal_basis TEXT,
  source_event TEXT,
  severity TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  calculation_mode TEXT NOT NULL DEFAULT 'manual',
  is_legal_deadline INTEGER NOT NULL DEFAULT 0,
  is_user_editable INTEGER NOT NULL DEFAULT 1,
  warning_threshold_hours INTEGER NOT NULL DEFAULT 48,
  critical_threshold_hours INTEGER NOT NULL DEFAULT 24,
  dashboard_from_at TEXT,
  completed_at TEXT,
  completed_note TEXT,
  cancelled_at TEXT,
  cancelled_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);



CREATE TABLE IF NOT EXISTS deadline_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  confidential_title TEXT,
  description TEXT,
  process_type TEXT NOT NULL,
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('legal_deadline', 'follow_up', 'appointment', 'warning', 'workflow_step')) DEFAULT 'follow_up',
  offset_days INTEGER NOT NULL DEFAULT 0,
  offset_hours INTEGER NOT NULL DEFAULT 0,
  reminder_days_before INTEGER,
  legal_basis TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('normal', 'important', 'critical', 'fatal')) DEFAULT 'normal',
  is_legal_deadline INTEGER NOT NULL DEFAULT 0,
  warning_threshold_hours INTEGER NOT NULL DEFAULT 48,
  critical_threshold_hours INTEGER NOT NULL DEFAULT 24,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deadline_audit (
  id TEXT PRIMARY KEY,
  deadline_id TEXT NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  category TEXT NOT NULL DEFAULT 'sonstiges',
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_text_references (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  matched_text TEXT NOT NULL,
  replacement_text TEXT NOT NULL DEFAULT '[Kontakt anonymisiert]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  anonymized_at TEXT,
  UNIQUE(contact_id, source_type, source_id, field_name, matched_text)
);

CREATE TABLE IF NOT EXISTS case_contacts (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  note TEXT,
  PRIMARY KEY (case_id, contact_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  case_id TEXT,
  details TEXT,
  previous_hash TEXT,
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS retention_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reference TEXT,
  reason TEXT,
  affected_rows INTEGER NOT NULL DEFAULT 0,
  affected_files INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_actions_created ON retention_actions(created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  app_version TEXT,
  mode TEXT NOT NULL DEFAULT 'sql',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS schema_migration_log (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_at ON deadlines(due_at);

CREATE INDEX IF NOT EXISTS idx_deadlines_status_due_at ON deadlines(status, due_at);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_measure_id ON deadlines(measure_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_measure ON deadlines(case_id, measure_id, due_at);
CREATE INDEX IF NOT EXISTS idx_deadlines_person_id ON deadlines(person_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_process ON deadlines(process_type, process_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_dashboard_from_at ON deadlines(dashboard_from_at);
CREATE INDEX IF NOT EXISTS idx_deadline_templates_process_type ON deadline_templates(process_type);
CREATE INDEX IF NOT EXISTS idx_deadline_audit_deadline_id ON deadline_audit(deadline_id);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_date ON case_notes(case_id, note_date DESC);
CREATE INDEX IF NOT EXISTS idx_case_note_links_note ON case_note_links(case_note_id);
CREATE INDEX IF NOT EXISTS idx_case_note_links_target ON case_note_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_case_note_links_case ON case_note_links(case_id);

CREATE INDEX IF NOT EXISTS idx_case_note_cases_case_id ON case_note_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_case_note_cases_note_id ON case_note_cases(note_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contact_text_refs_contact ON contact_text_references(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_text_refs_source ON contact_text_references(source_type, source_id);

CREATE VIRTUAL TABLE IF NOT EXISTS case_notes_fts USING fts5(
  id UNINDEXED,
  case_id UNINDEXED,
  case_number UNINDEXED,
  title,
  participants,
  content,
  next_steps,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE VIRTUAL TABLE IF NOT EXISTS case_documents_fts USING fts5(
  id UNINDEXED,
  case_id UNINDEXED,
  case_number UNINDEXED,
  title,
  filename,
  extracted_text,
  tokenize = 'unicode61 remove_diacritics 2'
);


-- ============================================================
-- Process modules added for Gremia.SBV 0.2
-- ============================================================

CREATE TABLE IF NOT EXISTS bem_processes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'zu_pruefen',
  title TEXT NOT NULL DEFAULT 'BEM-Verfahren',
  trigger_type TEXT NOT NULL DEFAULT 'sonstiges',
  trigger_description TEXT,
  sickness_days_twelve_months INTEGER,
  bem_offered_at TEXT,
  response_due_at TEXT,
  employee_response TEXT NOT NULL DEFAULT 'offen',
  employee_response_at TEXT,
  privacy_notice_at TEXT,
  consent_scope TEXT,
  consent_withdrawn_at TEXT,
  data_retention_note TEXT,
  first_meeting_at TEXT,
  participants TEXT,
  measures TEXT,
  measure_owners TEXT,
  next_review_at TEXT,
  result TEXT,
  completion_reason TEXT,
  confidential_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bem_process_contacts (
  process_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (process_id, contact_id),
  FOREIGN KEY (process_id) REFERENCES bem_processes(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bem_process_events (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (process_id) REFERENCES bem_processes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bem_processes_case_id ON bem_processes(case_id);
CREATE INDEX IF NOT EXISTS idx_bem_processes_status ON bem_processes(status);
CREATE INDEX IF NOT EXISTS idx_bem_processes_response_due_at ON bem_processes(response_due_at);
CREATE INDEX IF NOT EXISTS idx_bem_process_contacts_contact_id ON bem_process_contacts(contact_id);

CREATE TABLE IF NOT EXISTS equalization_processes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  application_status TEXT NOT NULL CHECK (application_status IN ('beratung', 'vorbereitung', 'eingereicht', 'nachfrage', 'bewilligt', 'abgelehnt', 'widerspruch', 'abgeschlossen')) DEFAULT 'beratung',
  agency_reference TEXT,
  application_submitted_at TEXT,
  decision_received_at TEXT,
  objection_due_at TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS termination_hearings (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'eingang',
  termination_type TEXT NOT NULL DEFAULT 'sonstiges',
  protection_status TEXT NOT NULL DEFAULT 'unklar',
  received_at TEXT,
  employer_deadline_at TEXT,
  sbv_statement_due_at TEXT,
  works_council_hearing_at TEXT,
  integration_office_requested_at TEXT,
  integration_office_decision_at TEXT,
  integration_office_decision TEXT,
  employer_reason TEXT,
  missing_information TEXT,
  sbv_assessment TEXT,
  statement TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portable_profile (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  is_portable_mode INTEGER NOT NULL DEFAULT 1,
  data_root TEXT NOT NULL DEFAULT './data',
  document_root TEXT NOT NULL DEFAULT './data/documents',
  backup_root TEXT NOT NULL DEFAULT './backups',
  last_path_check_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bem_processes_case_id ON bem_processes(case_id);
CREATE INDEX IF NOT EXISTS idx_bem_processes_response_due_at ON bem_processes(response_due_at);
CREATE INDEX IF NOT EXISTS idx_equalization_processes_case_id ON equalization_processes(case_id);
CREATE INDEX IF NOT EXISTS idx_equalization_objection_due_at ON equalization_processes(objection_due_at);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_case_id ON termination_hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_status ON termination_hearings(status);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_due ON termination_hearings(sbv_statement_due_at);

-- 0.3.17 document encryption metadata
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_measure_id ON case_documents(measure_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_measure ON case_documents(case_id, measure_id, created_at);
CREATE INDEX IF NOT EXISTS idx_case_documents_ocr_status ON case_documents(ocr_status, imported_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_document ON case_document_ocr_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_status ON case_document_ocr_jobs(status, updated_at);


-- Reports module added for Gremia.SBV 0.3.33
CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  warning_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_exports_type ON report_exports(report_type);
CREATE TABLE IF NOT EXISTS prevention_processes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'zu_pruefen',
  first_knowledge_at TEXT,
  requested_at TEXT,
  employer_response_due_at TEXT,
  employer_responded_at TEXT,
  integration_office_involved_at TEXT,
  difficulty_type TEXT NOT NULL DEFAULT 'sonstiges',
  risk_type TEXT NOT NULL DEFAULT 'sonstiges',
  person_status TEXT NOT NULL DEFAULT 'unklar',
  hazard_description TEXT,
  employer_request_summary TEXT,
  measures TEXT,
  result TEXT,
  next_review_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prevention_process_contacts (
  process_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (process_id, contact_id),
  FOREIGN KEY (process_id) REFERENCES prevention_processes(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prevention_process_events (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (process_id) REFERENCES prevention_processes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prevention_processes_case_id ON prevention_processes(case_id);
CREATE INDEX IF NOT EXISTS idx_prevention_processes_status ON prevention_processes(status);
CREATE INDEX IF NOT EXISTS idx_prevention_process_contacts_contact_id ON prevention_process_contacts(contact_id);

-- Knowledge base / SBV-Kompass (0.4.2)
CREATE TABLE IF NOT EXISTS legal_norms (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  paragraph TEXT NOT NULL,
  title TEXT NOT NULL,
  short_text TEXT NOT NULL,
  full_text TEXT,
  sbv_meaning TEXT,
  practice_note TEXT,
  typical_cases TEXT,
  deadline_relevance TEXT,
  template_relevance TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, paragraph)
);
CREATE INDEX IF NOT EXISTS idx_legal_norms_source ON legal_norms(source);
CREATE INDEX IF NOT EXISTS idx_legal_norms_paragraph ON legal_norms(paragraph);
CREATE INDEX IF NOT EXISTS idx_legal_norms_title ON legal_norms(title);

CREATE TABLE IF NOT EXISTS case_legal_references (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  legal_norm_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(case_id, legal_norm_id),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_case_legal_references_case_id ON case_legal_references(case_id);
CREATE INDEX IF NOT EXISTS idx_case_legal_references_norm_id ON case_legal_references(legal_norm_id);

CREATE TABLE IF NOT EXISTS norm_comments (
  id TEXT PRIMARY KEY,
  legal_norm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS norm_case_law (
  id TEXT PRIMARY KEY,
  legal_norm_id TEXT NOT NULL,
  court TEXT NOT NULL,
  decision_date TEXT,
  file_number TEXT NOT NULL,
  short_holding TEXT NOT NULL,
  relevance TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS norm_checklist_items (
  id TEXT PRIMARY KEY,
  legal_norm_id TEXT NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  legal_basis_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template_renders (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_renders_case ON template_renders(case_id, created_at);


CREATE TABLE IF NOT EXISTS personal_data_audit_log (
  id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  occurred_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  case_id TEXT,
  purpose TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_personal_data_audit_sequence ON personal_data_audit_log(sequence);
CREATE INDEX IF NOT EXISTS idx_personal_data_audit_case ON personal_data_audit_log(case_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_personal_data_audit_subject ON personal_data_audit_log(subject_type, subject_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_personal_data_audit_action ON personal_data_audit_log(action, occurred_at);

-- SBV-Beteiligungsmonitor (§ 178 Abs. 2 SGB IX) - 0.8.5
CREATE TABLE IF NOT EXISTS sbv_participations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  title TEXT NOT NULL,
  measure_type TEXT NOT NULL DEFAULT 'sonstiges',
  status TEXT NOT NULL DEFAULT 'neu',
  risk_level TEXT NOT NULL DEFAULT 'normal',
  person_status TEXT NOT NULL DEFAULT 'unklar',
  decision_stage TEXT NOT NULL DEFAULT 'unklar',
  first_known_at TEXT,
  information_received_at TEXT,
  hearing_requested_at TEXT,
  statement_due_at TEXT,
  statement_submitted_at TEXT,
  employer_decision_at TEXT,
  implementation_at TEXT,
  information_complete INTEGER NOT NULL DEFAULT 0,
  hearing_before_decision INTEGER NOT NULL DEFAULT 0,
  decision_notified INTEGER NOT NULL DEFAULT 0,
  suspension_requested_at TEXT,
  suspension_due_at TEXT,
  violation_summary TEXT,
  sbv_position TEXT,
  next_step TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sbv_participation_events (
  id TEXT PRIMARY KEY,
  participation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(participation_id) REFERENCES sbv_participations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sbv_participations_case_id ON sbv_participations(case_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participations_status ON sbv_participations(status);
CREATE INDEX IF NOT EXISTS idx_sbv_participations_risk ON sbv_participations(risk_level);
CREATE INDEX IF NOT EXISTS idx_sbv_participations_statement_due ON sbv_participations(statement_due_at);
CREATE INDEX IF NOT EXISTS idx_sbv_participations_suspension_due ON sbv_participations(suspension_due_at);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_events_process ON sbv_participation_events(participation_id, created_at);

-- Fallaktenzentrierte Maßnahmenarchitektur (Schema 0020)
CREATE TABLE IF NOT EXISTS case_measures (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  risk_level TEXT NOT NULL DEFAULT 'normal',
  created_from TEXT NOT NULL DEFAULT 'manual',
  summary TEXT,
  next_step TEXT,
  due_at TEXT,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  requires_follow_up INTEGER NOT NULL DEFAULT 0,
  source_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_measure_participation (
  measure_id TEXT PRIMARY KEY,
  employer_measure_type TEXT NOT NULL DEFAULT 'sonstiges',
  person_status TEXT NOT NULL DEFAULT 'unklar',
  decision_stage TEXT NOT NULL DEFAULT 'unklar',
  participation_status TEXT NOT NULL DEFAULT 'neu',
  sbv_knowledge_at TEXT,
  employer_information_at TEXT,
  hearing_requested_at TEXT,
  sbv_statement_due_at TEXT,
  sbv_statement_submitted_at TEXT,
  employer_decision_at TEXT,
  implementation_at TEXT,
  information_complete INTEGER NOT NULL DEFAULT 0,
  hearing_before_decision INTEGER NOT NULL DEFAULT 0,
  decision_notified INTEGER NOT NULL DEFAULT 0,
  suspension_requested_at TEXT,
  suspension_deadline_at TEXT,
  violation_summary TEXT,
  sbv_position TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_measure_events (
  id TEXT PRIMARY KEY,
  measure_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_measures_case ON case_measures(case_id, type, status);
CREATE INDEX IF NOT EXISTS idx_case_measures_type_status ON case_measures(type, status);
CREATE INDEX IF NOT EXISTS idx_case_measures_due ON case_measures(due_at);
CREATE INDEX IF NOT EXISTS idx_case_measures_source ON case_measures(source_id);
CREATE INDEX IF NOT EXISTS idx_case_measures_follow_up ON case_measures(case_id, requires_follow_up, status);
CREATE INDEX IF NOT EXISTS idx_case_measure_participation_status ON case_measure_participation(participation_status);
CREATE INDEX IF NOT EXISTS idx_case_measure_participation_statement_due ON case_measure_participation(sbv_statement_due_at);
CREATE INDEX IF NOT EXISTS idx_case_measure_participation_suspension_due ON case_measure_participation(suspension_deadline_at);
CREATE INDEX IF NOT EXISTS idx_case_measure_events_measure_created ON case_measure_events(measure_id, created_at);

CREATE TABLE IF NOT EXISTS case_measure_workplace_accommodation (
  measure_id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'sonstiges',
  accommodation_status TEXT NOT NULL DEFAULT 'entwurf',
  requested_adjustment TEXT NOT NULL DEFAULT '',
  legal_basis TEXT NOT NULL DEFAULT '§ 164 Abs. 4 SGB IX',
  barrier_or_limitation TEXT,
  workplace_context TEXT,
  proposed_solution TEXT,
  technical_aid_needed INTEGER NOT NULL DEFAULT 0,
  organizational_adjustment_needed INTEGER NOT NULL DEFAULT 0,
  working_time_adjustment_needed INTEGER NOT NULL DEFAULT 0,
  qualification_needed INTEGER NOT NULL DEFAULT 0,
  fixed_workplace_needed INTEGER NOT NULL DEFAULT 0,
  homeoffice_or_mobile_work_relevant INTEGER NOT NULL DEFAULT 0,
  inclusion_office_involved INTEGER NOT NULL DEFAULT 0,
  rehab_carrier_involved INTEGER NOT NULL DEFAULT 0,
  employer_response_status TEXT NOT NULL DEFAULT 'offen',
  employer_response_at TEXT,
  implementation_status TEXT NOT NULL DEFAULT 'nicht_begonnen',
  implementation_due_at TEXT,
  effectiveness_review_at TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_status ON case_measure_workplace_accommodation(accommodation_status);
CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_category ON case_measure_workplace_accommodation(category);
CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_review ON case_measure_workplace_accommodation(effectiveness_review_at);
-- 0.9.1: Personenverzeichnis, Importprotokoll und Datenschutz-Lifecycle.
CREATE TABLE IF NOT EXISTS protected_persons (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  record_kind TEXT NOT NULL DEFAULT 'identified_person' CHECK (record_kind IN ('identified_person','pseudonymous_request')),
  pseudonym_label TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  personnel_number TEXT,
  work_email TEXT,
  organizational_unit TEXT,
  location TEXT,
  employment_state TEXT NOT NULL DEFAULT 'active_employee' CHECK (employment_state IN ('active_employee', 'left_company', 'unknown')),
  left_company_at TEXT,
  left_company_reason TEXT,
  protection_status TEXT NOT NULL CHECK (protection_status IN ('severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive')),
  status_valid_from TEXT,
  status_valid_until TEXT,
  evidence_checked_at TEXT,
  status_source TEXT NOT NULL DEFAULT 'unknown' CHECK (status_source IN ('employer_list', 'manual', 'self_disclosure', 'document_presented', 'unknown')),
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'expiring_soon', 'expired_review_required', 'retention_documented', 'anonymization_pending', 'anonymized', 'deleted_marker')),
  expiry_warning_created_at TEXT,
  expiry_review_due_at TEXT,
  retention_reason TEXT,
  retention_review_at TEXT,
  anonymized_at TEXT,
  anonymization_reason TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_protected_persons_name ON protected_persons(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_protected_persons_personnel_number ON protected_persons(personnel_number);
CREATE INDEX IF NOT EXISTS idx_protected_persons_work_email ON protected_persons(work_email);
CREATE INDEX IF NOT EXISTS idx_protected_persons_status_until ON protected_persons(status_valid_until);
CREATE INDEX IF NOT EXISTS idx_protected_persons_lifecycle ON protected_persons(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_protected_persons_employment ON protected_persons(employment_state, left_company_at);

CREATE TABLE IF NOT EXISTS person_import_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  sheet_name TEXT,
  header_row_index INTEGER NOT NULL DEFAULT 0,
  first_data_row_index INTEGER NOT NULL DEFAULT 1,
  csv_delimiter TEXT,
  csv_encoding TEXT,
  column_mapping_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS person_import_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES person_import_profiles(id) ON DELETE SET NULL,
  source_file_name TEXT NOT NULL,
  source_file_hash TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS person_import_run_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES person_import_runs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'unchanged', 'conflict', 'skipped', 'not_in_list')),
  protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
  match_strategy TEXT CHECK (match_strategy IN ('personnel_number', 'work_email', 'name_only_conflict', 'none')),
  conflict_reason TEXT,
  validation_message TEXT,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_person_import_items_run ON person_import_run_items(run_id, row_number);
CREATE INDEX IF NOT EXISTS idx_person_import_items_person ON person_import_run_items(protected_person_id);

CREATE TABLE IF NOT EXISTS person_case_links (
  id TEXT PRIMARY KEY,
  protected_person_id TEXT NOT NULL REFERENCES protected_persons(id) ON DELETE CASCADE,
  case_file_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  link_state TEXT NOT NULL DEFAULT 'active' CHECK (link_state IN ('active', 'person_anonymized', 'removed')),
  created_at TEXT NOT NULL,
  anonymized_at TEXT,
  link_reason TEXT,
  UNIQUE(protected_person_id, case_file_id)
);

CREATE INDEX IF NOT EXISTS idx_person_case_links_person ON person_case_links(protected_person_id);
CREATE INDEX IF NOT EXISTS idx_person_case_links_case ON person_case_links(case_file_id);
CREATE INDEX IF NOT EXISTS idx_person_case_links_state ON person_case_links(link_state);
-- 0026: Mehrere vertrauliche Notizen direkt an Maßnahmen/Prozessknoten.
-- Dient der Protokollierung von Terminen, Nachfassern und Verlauf direkt am Maßnahmenkontext.

CREATE TABLE IF NOT EXISTS case_measure_notes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  measure_type TEXT NOT NULL CHECK (measure_type IN ('prevention','bem','termination_hearing','equalization','participation','workplace_accommodation')),
  measure_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note_at TEXT NOT NULL,
  participants TEXT,
  content TEXT NOT NULL,
  next_steps TEXT,
  contains_health_data INTEGER NOT NULL DEFAULT 1,
  confidential_level TEXT NOT NULL DEFAULT 'sensibel' CHECK (confidential_level IN ('normal','sensibel','hoch_sensibel')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_measure_notes_measure ON case_measure_notes(measure_type, measure_id, note_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_measure_notes_case ON case_measure_notes(case_id, note_at DESC);


-- 0027: Zentraler Fallakten-Suchindex für strukturierte Moduldaten und Dokumentvolltexte.
-- Die Tabelle liegt im SQLCipher-Vault und enthält kopierte Suchtexte; sie ist daher
-- bewusst an Falllöschung und Fallanonymisierung gekoppelt.

CREATE TABLE IF NOT EXISTS case_search_index (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_number TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_label TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT,
  occurred_at TEXT,
  updated_at TEXT NOT NULL,
  confidentiality TEXT NOT NULL DEFAULT 'sensibel',
  contains_health_data INTEGER NOT NULL DEFAULT 1,
  extraction_quality TEXT NOT NULL DEFAULT 'structured',
  navigation_kind TEXT NOT NULL,
  navigation_id TEXT NOT NULL,
  navigation_sub_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_search_index_case ON case_search_index(case_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_case_search_index_source ON case_search_index(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_case_search_index_navigation ON case_search_index(navigation_kind, navigation_id);

CREATE TABLE IF NOT EXISTS case_search_index_state (
  case_id TEXT PRIMARY KEY,
  indexed_at TEXT NOT NULL,
  last_source_updated_at TEXT,
  source_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS case_search_index_fts USING fts5(
  index_id UNINDEXED,
  title,
  content,
  keywords,
  source_label,
  tokenize = 'unicode61 remove_diacritics 2'
);


-- 0028: Metadaten zur lokalen Dokumenttext-Extraktion für den Suchindex.
-- extraction_quality unterscheidet native_text, ocr, manual und unknown.
-- text_extraction_status dokumentiert extracted, empty, unsupported oder failed.
-- 0030: text_extractor_id und text_extraction_error machen Dokumentextraktion diagnosefähig.
-- 0031: OCR-Status, lokale OCR-Textablage und OCR-Hintergrundjobs erweitern den Suchindex ohne Cloud-Anbindung.
