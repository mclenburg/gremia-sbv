-- Gremia.SBV Migration 0009
-- Führt eine eigene Migrationshistorie ein. Die Tabelle wird zusätzlich vom
-- MigrationService vor jedem Migrationslauf defensiv angelegt.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  app_version TEXT,
  mode TEXT NOT NULL DEFAULT 'sql',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migration_log (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO settings (key, value, updated_at)
VALUES ('database.schema.version', '0009', datetime('now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
