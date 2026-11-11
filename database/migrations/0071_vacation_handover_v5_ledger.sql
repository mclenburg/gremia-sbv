-- Optional bindings and baselines for version 5; earlier handover records remain unchanged.
ALTER TABLE case_handover_exports ADD COLUMN target_key_fingerprint TEXT;
ALTER TABLE case_handover_exports ADD COLUMN format_version INTEGER;
ALTER TABLE case_handover_imports ADD COLUMN origin_key_fingerprint TEXT;
ALTER TABLE case_handover_imports ADD COLUMN target_key_fingerprint TEXT;
ALTER TABLE case_handover_imports ADD COLUMN format_version INTEGER;
ALTER TABLE case_handover_imports ADD COLUMN source_package_id TEXT;
ALTER TABLE case_handover_import_items ADD COLUMN baseline_sha256 TEXT;
