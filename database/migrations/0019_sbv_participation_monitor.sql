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
