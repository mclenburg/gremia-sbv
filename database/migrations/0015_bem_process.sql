-- BEM-Grundmodul.
-- 0.5.4: robuste Reparatur für frühe/kaputte 0.5.0-Teststände.
--
-- Hintergrund:
-- Frühere Teststände konnten bereits eine bem_processes-Tabelle mit unbekanntem,
-- unvollständigem Schema erzeugen. Die Migration darf deshalb NICHT aus Spalten
-- wie status, title oder current_phase lesen, weil diese je nach Fehlstand fehlen
-- können. Die alte Tabelle wird nur gesichert und die neue BEM-Struktur sauber
-- angelegt.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS bem_processes_legacy_0500;

-- Frischinstallation: Falls bem_processes noch gar nicht existiert, erzeugen wir
-- eine minimale Dummy-Tabelle, die direkt im nächsten Schritt gesichert wird.
CREATE TABLE IF NOT EXISTS bem_processes (
  id TEXT PRIMARY KEY,
  case_id TEXT
);

ALTER TABLE bem_processes RENAME TO bem_processes_legacy_0500;

DROP TABLE IF EXISTS bem_process_contacts;
DROP TABLE IF EXISTS bem_process_events;

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

PRAGMA foreign_keys = ON;
ALTER TABLE bem_processes ADD COLUMN privacy_notice_at TEXT;
ALTER TABLE bem_processes ADD COLUMN consent_scope TEXT;
ALTER TABLE bem_processes ADD COLUMN consent_withdrawn_at TEXT;
ALTER TABLE bem_processes ADD COLUMN data_retention_note TEXT;
ALTER TABLE bem_processes ADD COLUMN measure_owners TEXT;
ALTER TABLE bem_processes ADD COLUMN completion_reason TEXT;
