-- 0020: Fallaktenzentrierte Maßnahmenarchitektur.
-- Personenbezogene fachliche SBV-Arbeit wird an die Fallakte gebunden.

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
CREATE INDEX IF NOT EXISTS idx_case_measure_participation_status ON case_measure_participation(participation_status);
CREATE INDEX IF NOT EXISTS idx_case_measure_participation_statement_due ON case_measure_participation(sbv_statement_due_at);
CREATE INDEX IF NOT EXISTS idx_case_measure_participation_suspension_due ON case_measure_participation(suspension_deadline_at);

INSERT OR IGNORE INTO case_measures (
  id, case_id, type, title, status, risk_level, created_from, summary, next_step, due_at,
  opened_at, closed_at, requires_follow_up, source_id, created_at, updated_at
)
SELECT
  id,
  case_id,
  'sbv_participation',
  title,
  CASE
    WHEN status IN ('abgeschlossen', 'pflichtverstoss_dokumentiert') THEN 'completed'
    WHEN status IN ('aussetzung_verlangt', 'nachholung_laeuft') THEN 'follow_up_required'
    WHEN status = 'stellungnahme_abgegeben' THEN 'waiting'
    WHEN status IN ('unterrichtung_pruefen', 'anhoerung_laeuft') THEN 'in_progress'
    ELSE 'open'
  END,
  risk_level,
  'migration',
  violation_summary,
  next_step,
  COALESCE(statement_due_at, suspension_due_at),
  COALESCE(first_known_at, created_at),
  CASE WHEN status IN ('abgeschlossen', 'pflichtverstoss_dokumentiert') THEN updated_at ELSE NULL END,
  CASE WHEN status IN ('abgeschlossen', 'pflichtverstoss_dokumentiert') THEN 0 ELSE 1 END,
  id,
  created_at,
  updated_at
FROM sbv_participations
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sbv_participations');

INSERT OR IGNORE INTO case_measure_participation (
  measure_id, employer_measure_type, person_status, decision_stage, participation_status,
  sbv_knowledge_at, employer_information_at, hearing_requested_at, sbv_statement_due_at,
  sbv_statement_submitted_at, employer_decision_at, implementation_at,
  information_complete, hearing_before_decision, decision_notified,
  suspension_requested_at, suspension_deadline_at, violation_summary, sbv_position, created_at, updated_at
)
SELECT
  id,
  measure_type,
  person_status,
  decision_stage,
  status,
  first_known_at,
  information_received_at,
  hearing_requested_at,
  statement_due_at,
  statement_submitted_at,
  employer_decision_at,
  implementation_at,
  information_complete,
  hearing_before_decision,
  decision_notified,
  suspension_requested_at,
  suspension_due_at,
  violation_summary,
  sbv_position,
  created_at,
  updated_at
FROM sbv_participations
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sbv_participations');
