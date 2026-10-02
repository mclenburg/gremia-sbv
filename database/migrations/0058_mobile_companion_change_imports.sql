CREATE TABLE IF NOT EXISTS mobile_companion_change_imports (
  id TEXT PRIMARY KEY,
  source_key_fingerprint TEXT NOT NULL,
  mobile_change_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  local_entity_type TEXT NOT NULL,
  local_entity_id TEXT NOT NULL,
  handover_import_id TEXT NOT NULL REFERENCES case_handover_imports(id) ON DELETE CASCADE,
  imported_at TEXT NOT NULL,
  UNIQUE(source_key_fingerprint, mobile_change_id)
);

CREATE INDEX IF NOT EXISTS idx_mobile_companion_change_imports_local
  ON mobile_companion_change_imports(local_entity_type, local_entity_id);
