export const APP_SCHEMA_VERSION = '0018';

export const DATABASE_SCHEMA_VERSION_KEY = 'database.schema.version';
export const LEGACY_DATABASE_SCHEMA_VERSION_KEY = 'settings.database.schema.version';
export const DATABASE_SCHEMA_APP_VERSION_KEY = 'database.schema.appVersion';

export const TERMINATION_HEARINGS_REQUIRED_COLUMNS = [
  'id',
  'case_id',
  'status',
  'termination_type',
  'protection_status',
  'received_at',
  'sbv_statement_due_at',
  'created_at',
  'updated_at'
] as const;

export const PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS = [
  'id',
  'sequence',
  'occurred_at',
  'actor',
  'action',
  'subject_type',
  'purpose',
  'previous_hash',
  'entry_hash'
] as const;
