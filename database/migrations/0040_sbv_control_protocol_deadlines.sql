ALTER TABLE sbv_control_protocols ADD COLUMN follow_up_due_at TEXT;

CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_follow_up ON sbv_control_protocols(follow_up_due_at);
