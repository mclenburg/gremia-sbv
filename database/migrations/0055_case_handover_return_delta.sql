-- 0055: Export-Mapping für Urlaubsvertretung und Rückgabe-Delta.

CREATE TABLE IF NOT EXISTS case_handover_exports (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  exported_at TEXT NOT NULL,
  valid_until TEXT,
  package_type TEXT NOT NULL DEFAULT 'vacation_handover',
  status TEXT NOT NULL DEFAULT 'open',
  target_instance_id TEXT,
  case_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_exports_package ON case_handover_exports(package_id);

CREATE TABLE IF NOT EXISTS case_handover_export_items (
  id TEXT PRIMARY KEY,
  handover_export_id TEXT NOT NULL REFERENCES case_handover_exports(id) ON DELETE CASCADE,
  package_ref TEXT NOT NULL,
  local_entity_type TEXT NOT NULL,
  local_entity_id TEXT NOT NULL,
  exported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_handover_export_items_package_ref ON case_handover_export_items(handover_export_id, package_ref);
CREATE INDEX IF NOT EXISTS idx_case_handover_export_items_local ON case_handover_export_items(local_entity_type, local_entity_id);
