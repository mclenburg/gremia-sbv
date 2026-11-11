-- Keep the source row's export-time content baseline for return conflict checks.
ALTER TABLE case_handover_export_items ADD COLUMN baseline_sha256 TEXT;
