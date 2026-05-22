-- 0032: Optionale Gremia.BR-Lesebrücke vorbereiten.
-- Keine Netzwerkkommunikation, keine Synchronisation: nur Vault-Konfiguration und Policy-Basis.

CREATE TABLE IF NOT EXISTS gremia_br_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  server_url TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password_secret TEXT NOT NULL DEFAULT '',
  last_connection_test_at TEXT,
  last_successful_login_at TEXT,
  profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
