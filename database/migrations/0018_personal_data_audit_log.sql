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
