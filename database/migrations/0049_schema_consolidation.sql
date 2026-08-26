-- Dokumentiert die abgeschlossene Konsolidierung der verbliebenen
-- Kompatibilitäts-Schemata. Strukturänderungen liegen ausschließlich in den
-- versionierten Migrationen und Migrations-Reparaturpfaden.
CREATE TABLE IF NOT EXISTS schema_migration_components (
  migration_version TEXT NOT NULL,
  component TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  PRIMARY KEY (migration_version, component)
);
