-- Patch 1: datensparsames, strukturiertes Maßnahmen-Lifecycle-Protokoll.
-- Die eigentlichen Baseline-Einträge werden nach Abschluss der SQL-Migrationen zentral
-- durch DatabaseRuntimeInitializer erzeugt, damit Fachservice-Konstruktoren nebenwirkungsfrei bleiben.
CREATE INDEX IF NOT EXISTS idx_personal_data_audit_lifecycle_period
  ON personal_data_audit_log(subject_type, occurred_at, sequence);
