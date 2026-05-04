-- 0.8.0b repair:
-- Earlier 0017 builds could leave a partial termination_hearings table behind.
-- In that state CREATE TABLE IF NOT EXISTS does not repair the table and the
-- subsequent status index fails with "no such column: status".
--
-- The termination module is new at this migration point. If the table exists
-- while 0017 has not been marked successful, it is treated as an incomplete
-- migration artifact and rebuilt from scratch.
DROP INDEX IF EXISTS idx_termination_hearings_case_id;
DROP INDEX IF EXISTS idx_termination_hearings_status;
DROP INDEX IF EXISTS idx_termination_hearings_due;
DROP TABLE IF EXISTS termination_hearings;

CREATE TABLE termination_hearings (
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

CREATE INDEX IF NOT EXISTS idx_termination_hearings_case_id ON termination_hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_status ON termination_hearings(status);
CREATE INDEX IF NOT EXISTS idx_termination_hearings_due ON termination_hearings(sbv_statement_due_at);
