import type { DatabaseAdapter } from './databaseService.js';

const PERSON_IMPORT_RUN_ITEM_COLUMNS = [
  'id',
  'run_id',
  'row_number',
  'action',
  'protected_person_id',
  'match_strategy',
  'conflict_reason',
  'validation_message',
  'changed_fields_json',
  'created_at',
];

function tableDefinition(database: DatabaseAdapter, tableName: string): string {
  return database.prepare<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(tableName)?.sql ?? '';
}

function uniqueLegacyTableName(database: DatabaseAdapter): string {
  const prefix = 'person_import_run_items_legacy_match_strategy';
  let candidate = prefix;
  let counter = 1;
  while (tableDefinition(database, candidate)) {
    candidate = `${prefix}_${counter}`;
    counter += 1;
  }
  return candidate;
}

export function repairPersonImportRunItemMatchStrategySchema(database: DatabaseAdapter): boolean {
  const definition = tableDefinition(database, 'person_import_run_items');
  if (!definition || definition.includes('name_exact_unique')) return false;

  const legacyTable = uniqueLegacyTableName(database);
  const columns = PERSON_IMPORT_RUN_ITEM_COLUMNS.join(', ');
  database.exec(`
    DROP INDEX IF EXISTS idx_person_import_items_run;
    DROP INDEX IF EXISTS idx_person_import_items_person;
    ALTER TABLE person_import_run_items RENAME TO ${legacyTable};
    CREATE TABLE person_import_run_items (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES person_import_runs(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'unchanged', 'conflict', 'skipped', 'not_in_list')),
      protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
      match_strategy TEXT CHECK (match_strategy IN ('personnel_number', 'work_email', 'name_exact_unique', 'name_only_conflict', 'none')),
      conflict_reason TEXT,
      validation_message TEXT,
      changed_fields_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    INSERT INTO person_import_run_items (${columns})
      SELECT ${columns}
      FROM ${legacyTable};
    DROP TABLE ${legacyTable};
    CREATE INDEX IF NOT EXISTS idx_person_import_items_run ON person_import_run_items(run_id, row_number);
    CREATE INDEX IF NOT EXISTS idx_person_import_items_person ON person_import_run_items(protected_person_id);
  `);
  return true;
}
