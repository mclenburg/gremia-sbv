-- BEM-Grundmodul.
CREATE TABLE IF NOT EXISTS bem_processes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  current_phase TEXT,
  title TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Hinweis: 0.5.1a baut die Tabelle bewusst neu auf, weil frühe 0.5.0-Teststände
-- bereits eine unvollständige bem_processes-Tabelle ohne status-Spalte erzeugt haben konnten.

ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500;

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
  first_meeting_at TEXT,
  participants TEXT,
  measures TEXT,
  next_review_at TEXT,
  result TEXT,
  confidential_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO bem_processes (id, case_id, status, title, trigger_type, employee_response, created_at, updated_at)
SELECT
  id,
  case_id,
  CASE
    WHEN current_phase = 'angebot' THEN 'angebot_vorzubereiten'
    WHEN current_phase = 'reaktion' THEN 'reaktion_abwarten'
    WHEN current_phase = 'gespraech' THEN 'gespraech_geplant'
    WHEN current_phase = 'massnahmen' THEN 'massnahmen_in_klaerung'
    WHEN current_phase = 'abschluss' THEN 'abgeschlossen'
    ELSE 'zu_pruefen'
  END,
  COALESCE(title, 'BEM-Verfahren'),
  'sonstiges',
  'offen',
  COALESCE(created_at, datetime('now')),
  COALESCE(updated_at, datetime('now'))
FROM bem_processes_legacy_0500;

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
