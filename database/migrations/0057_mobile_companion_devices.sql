-- 0057: Vertrauensbeziehungen für die Android-Begleit-App.

CREATE TABLE IF NOT EXISTS mobile_companion_devices (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL UNIQUE,
  recipient_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_snapshot_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mobile_companion_devices_status_label
  ON mobile_companion_devices(status, label);
