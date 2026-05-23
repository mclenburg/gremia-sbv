CREATE TABLE IF NOT EXISTS case_handover_imports (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  mode TEXT NOT NULL DEFAULT 'create_new',
  created_case_count INTEGER NOT NULL DEFAULT 0,
  updated_case_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_package ON case_handover_imports(package_id);

CREATE TABLE IF NOT EXISTS case_handover_import_items (
  id TEXT PRIMARY KEY,
  handover_import_id TEXT NOT NULL REFERENCES case_handover_imports(id) ON DELETE CASCADE,
  local_entity_type TEXT NOT NULL,
  local_entity_id TEXT NOT NULL,
  package_ref TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_handover_items_local ON case_handover_import_items(local_entity_type, local_entity_id);

ALTER TABLE cases ADD COLUMN handover_import_id TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL;
ALTER TABLE cases ADD COLUMN handover_package_id TEXT;
ALTER TABLE cases ADD COLUMN handover_valid_until TEXT;
ALTER TABLE cases ADD COLUMN handover_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE cases ADD COLUMN handover_continue_confirmed_at TEXT;
ALTER TABLE cases ADD COLUMN handover_continue_reason TEXT;

ALTER TABLE case_measures ADD COLUMN handover_import_id TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL;
ALTER TABLE case_measures ADD COLUMN handover_package_id TEXT;
ALTER TABLE case_measures ADD COLUMN handover_valid_until TEXT;
ALTER TABLE case_measures ADD COLUMN handover_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE case_measures ADD COLUMN handover_continue_confirmed_at TEXT;
ALTER TABLE case_measures ADD COLUMN handover_continue_reason TEXT;
