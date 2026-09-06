-- 0056: Optionale, ausschließlich öffentliche Empfängerprofile für sichere Übergaben.

CREATE TABLE IF NOT EXISTS transfer_recipient_profiles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL UNIQUE,
  recipient_token TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfer_recipient_profiles_active_label
  ON transfer_recipient_profiles(active, label);
