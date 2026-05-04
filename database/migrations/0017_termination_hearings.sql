CREATE TABLE IF NOT EXISTS termination_hearings (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  status TEXT NOT NULL,
  termination_type TEXT NOT NULL,
  protection_status TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_termination_hearings_case_id ON termination_hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_status ON termination_hearings(status);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_due ON termination_hearings(sbv_statement_due_at);
