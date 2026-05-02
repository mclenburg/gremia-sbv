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
