CREATE TABLE IF NOT EXISTS gremia_br_case_creations (
  id TEXT PRIMARY KEY,
  local_case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  security_domain TEXT NOT NULL,
  procedure_type TEXT NOT NULL,
  remote_case_id TEXT,
  remote_case_reference TEXT,
  remote_procedure_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('case_submission_pending','case_created','procedure_created','completed','needs_review')),
  correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gremia_br_case_creations_pending_case
  ON gremia_br_case_creations(local_case_id) WHERE status != 'completed';
