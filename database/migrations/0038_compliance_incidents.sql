CREATE TABLE IF NOT EXISTS compliance_incidents (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  category TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  affected_data_categories TEXT NOT NULL DEFAULT '',
  immediate_measures TEXT NOT NULL DEFAULT '',
  dsb_notified_at TEXT,
  authority_notification_checked INTEGER NOT NULL DEFAULT 0,
  data_subjects_informed_at TEXT,
  closed_at TEXT,
  lessons_learned TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_incidents_status ON compliance_incidents(status, discovered_at);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_risk ON compliance_incidents(risk_level, discovered_at);

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('0038', datetime('now'));
