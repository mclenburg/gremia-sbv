CREATE TABLE IF NOT EXISTS sbv_resource_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  provider TEXT,
  participants TEXT,
  task_context TEXT,
  necessity_reason TEXT,
  employer_reaction TEXT,
  cost_note TEXT,
  status TEXT NOT NULL DEFAULT 'documented',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_kind ON sbv_resource_records(kind);
CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_status ON sbv_resource_records(status);
CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_started ON sbv_resource_records(started_at);
