CREATE TABLE IF NOT EXISTS retention_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reference TEXT,
  reason TEXT,
  affected_rows INTEGER NOT NULL DEFAULT 0,
  affected_files INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_actions_created ON retention_actions(created_at DESC);
