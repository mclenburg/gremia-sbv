CREATE TRIGGER IF NOT EXISTS personal_data_audit_no_update
BEFORE UPDATE ON personal_data_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Persönliches Audit ist append-only.');
END;

CREATE TRIGGER IF NOT EXISTS personal_data_audit_no_delete
BEFORE DELETE ON personal_data_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Persönliches Audit ist append-only.');
END;
