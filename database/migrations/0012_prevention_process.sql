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
