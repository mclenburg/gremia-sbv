-- 0.9.1: Personenverzeichnis, Importprotokoll und Datenschutz-Lifecycle.
CREATE TABLE IF NOT EXISTS protected_persons (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  personnel_number TEXT,
  work_email TEXT,
  organizational_unit TEXT,
  location TEXT,
  employment_state TEXT NOT NULL DEFAULT 'active_employee' CHECK (employment_state IN ('active_employee', 'left_company', 'unknown')),
  left_company_at TEXT,
  left_company_reason TEXT,
  protection_status TEXT NOT NULL CHECK (protection_status IN ('severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive')),
  status_valid_from TEXT,
  status_valid_until TEXT,
  evidence_checked_at TEXT,
  status_source TEXT NOT NULL DEFAULT 'unknown' CHECK (status_source IN ('employer_list', 'manual', 'self_disclosure', 'document_presented', 'unknown')),
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'expiring_soon', 'expired_review_required', 'retention_documented', 'anonymization_pending', 'anonymized', 'deleted_marker')),
  expiry_warning_created_at TEXT,
  expiry_review_due_at TEXT,
  retention_reason TEXT,
  retention_review_at TEXT,
  anonymized_at TEXT,
  anonymization_reason TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_protected_persons_name ON protected_persons(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_protected_persons_personnel_number ON protected_persons(personnel_number);
CREATE INDEX IF NOT EXISTS idx_protected_persons_work_email ON protected_persons(work_email);
CREATE INDEX IF NOT EXISTS idx_protected_persons_status_until ON protected_persons(status_valid_until);
CREATE INDEX IF NOT EXISTS idx_protected_persons_lifecycle ON protected_persons(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_protected_persons_employment ON protected_persons(employment_state, left_company_at);

CREATE TABLE IF NOT EXISTS person_import_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  sheet_name TEXT,
  header_row_index INTEGER NOT NULL DEFAULT 0,
  first_data_row_index INTEGER NOT NULL DEFAULT 1,
  csv_delimiter TEXT,
  csv_encoding TEXT,
  column_mapping_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS person_import_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES person_import_profiles(id) ON DELETE SET NULL,
  source_file_name TEXT NOT NULL,
  source_file_hash TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS person_import_run_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES person_import_runs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'unchanged', 'conflict', 'skipped', 'not_in_list')),
  protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
  match_strategy TEXT CHECK (match_strategy IN ('personnel_number', 'work_email', 'name_only_conflict', 'none')),
  conflict_reason TEXT,
  validation_message TEXT,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_person_import_items_run ON person_import_run_items(run_id, row_number);
CREATE INDEX IF NOT EXISTS idx_person_import_items_person ON person_import_run_items(protected_person_id);

CREATE TABLE IF NOT EXISTS person_case_links (
  id TEXT PRIMARY KEY,
  protected_person_id TEXT NOT NULL REFERENCES protected_persons(id) ON DELETE CASCADE,
  case_file_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  link_state TEXT NOT NULL DEFAULT 'active' CHECK (link_state IN ('active', 'person_anonymized', 'removed')),
  created_at TEXT NOT NULL,
  anonymized_at TEXT,
  link_reason TEXT,
  UNIQUE(protected_person_id, case_file_id)
);

CREATE INDEX IF NOT EXISTS idx_person_case_links_person ON person_case_links(protected_person_id);
CREATE INDEX IF NOT EXISTS idx_person_case_links_case ON person_case_links(case_file_id);
CREATE INDEX IF NOT EXISTS idx_person_case_links_state ON person_case_links(link_state);
