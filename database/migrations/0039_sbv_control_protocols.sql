CREATE TABLE IF NOT EXISTS sbv_control_protocols (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  partner TEXT NOT NULL,
  topic TEXT NOT NULL,
  meeting_at TEXT NOT NULL,
  participants TEXT,
  legal_context TEXT,
  discussion TEXT,
  result TEXT,
  next_steps TEXT,
  status TEXT NOT NULL DEFAULT 'documented',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_partner ON sbv_control_protocols(partner);
CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_topic ON sbv_control_protocols(topic);
CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_status ON sbv_control_protocols(status);
CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_meeting ON sbv_control_protocols(meeting_at DESC);
