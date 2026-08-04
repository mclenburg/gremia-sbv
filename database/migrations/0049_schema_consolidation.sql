-- Konsolidiert alle verbliebenen Kompatibilitäts-Schemata in den versionierten
-- Migrationslauf. Die zugehörigen idempotenten Struktur-Hooks werden durch
-- MigrationService innerhalb derselben Migrationstransaktion ausgeführt.
CREATE TABLE IF NOT EXISTS schema_migration_components (
  migration_version TEXT NOT NULL,
  component TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  PRIMARY KEY (migration_version, component)
);
