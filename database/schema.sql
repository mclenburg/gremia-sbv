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
  updated_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS case_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  display_title TEXT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  extracted_text TEXT,
  contains_health_data INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS legal_references (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  paragraph TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS case_legal_references (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  legal_reference_id TEXT NOT NULL REFERENCES legal_references(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, legal_reference_id)
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
CREATE INDEX IF NOT EXISTS idx_deadlines_person_id ON deadlines(person_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_process ON deadlines(process_type, process_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_dashboard_from_at ON deadlines(dashboard_from_at);
CREATE INDEX IF NOT EXISTS idx_deadline_templates_process_type ON deadline_templates(process_type);
CREATE INDEX IF NOT EXISTS idx_deadline_audit_deadline_id ON deadline_audit(deadline_id);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_date ON case_notes(case_id, note_date DESC);
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
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  trigger_date TEXT,
  au_days_in_12_months INTEGER,
  invitation_sent_at TEXT,
  response_due_at TEXT,
  consent_status TEXT NOT NULL CHECK (consent_status IN ('offen', 'erteilt', 'abgelehnt', 'widerrufen')) DEFAULT 'offen',
  first_meeting_at TEXT,
  current_phase TEXT NOT NULL CHECK (current_phase IN ('pruefung', 'einladung', 'zustimmung', 'erstgespraech', 'klaerung', 'massnahmen', 'evaluation', 'abgeschlossen')) DEFAULT 'pruefung',
  sbv_involved INTEGER NOT NULL DEFAULT 0,
  br_involved INTEGER NOT NULL DEFAULT 0,
  works_doctor_involved INTEGER NOT NULL DEFAULT 0,
  integration_office_involved INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bem_measures (
  id TEXT PRIMARY KEY,
  bem_process_id TEXT NOT NULL REFERENCES bem_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_party TEXT,
  due_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('geplant', 'in_umsetzung', 'wirksam', 'nicht_wirksam', 'verworfen')) DEFAULT 'geplant',
  evaluation_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  hearing_received_at TEXT NOT NULL,
  employer_deadline_at TEXT,
  termination_type TEXT CHECK (termination_type IN ('ordentlich', 'ausserordentlich', 'aenderungskuendigung', 'unbekannt')) DEFAULT 'unbekannt',
  sbv_hearing_complete INTEGER NOT NULL DEFAULT 0,
  br_hearing_known INTEGER NOT NULL DEFAULT 0,
  integration_office_approval_required INTEGER NOT NULL DEFAULT 1,
  integration_office_approval_status TEXT CHECK (integration_office_approval_status IN ('unbekannt', 'beantragt', 'erteilt', 'abgelehnt', 'nicht_erforderlich')) DEFAULT 'unbekannt',
  statement_status TEXT NOT NULL CHECK (statement_status IN ('offen', 'in_bearbeitung', 'abgegeben', 'keine_stellungnahme')) DEFAULT 'offen',
  statement_sent_at TEXT,
  risk_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
CREATE INDEX IF NOT EXISTS idx_termination_hearings_received_at ON termination_hearings(hearing_received_at);

-- 0.3.17 document encryption metadata
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);


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
