import type { DatabaseAdapter } from './databaseService.js';
import { SEARCH_SOURCE_CATALOG } from './search/searchSourceCatalog.js';

export interface SchemaMigrationHook {
  version: string;
  components: readonly string[];
  apply(db: DatabaseAdapter): void;
}

function recordComponent(db: DatabaseAdapter, version: string, component: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO schema_migration_components (migration_version, component, applied_at)
    VALUES (?, ?, ?)
  `).run(version, component, new Date().toISOString());
}

const CONSOLIDATED_COMPONENTS = [
  'personal_data_audit',
  'compliance_incidents',
  'activity_journal_preferences',
  'activity_journal',
  'case_measures',
  'participation',
  'recruiting_participation',
  'sbv_control_protocol',
  'sbv_participation_violations',
  'sbv_participation_violation_documents',
  'sbv_resources',
  'workplace_accommodation',
  'cases_and_fts',
  'case_handover',
  'contacts',
  'document_ocr',
  'knowledge',
  'person_case_binding',
  'privacy_review',
  'reports',
  'retention',
  'search_index',
  'templates',
] as const;

const SCHEMA_MIGRATION_HOOKS: Readonly<Record<string, SchemaMigrationHook>> = {
  '0067': {
    version: '0067',
    components: [],
    apply(db) {
      const tables = new Set(SEARCH_SOURCE_CATALOG.flatMap((entry) => [entry.table, ...entry.childTables]));
      for (const table of tables) {
        // Names come only from the static, reviewed catalog, never user input.
        const exists = db.prepare<{ found: number }>("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
        if (!exists) continue;
        for (const [event, suffix] of [['INSERT', 'insert'], ['UPDATE', 'update'], ['DELETE', 'delete']] as const) {
          db.exec(`CREATE TRIGGER IF NOT EXISTS search_dirty_${table}_${suffix}
            AFTER ${event} ON ${table}
            BEGIN
              UPDATE search_change_clock SET revision = revision + 1 WHERE id = 1;
              INSERT INTO search_dirty_tables(table_name, revision)
                SELECT '${table}', revision FROM search_change_clock WHERE id = 1
                ON CONFLICT(table_name) DO UPDATE SET revision = excluded.revision;
            END;`);
        }
      }
    },
  },
  '0049': {
    version: '0049',
    components: CONSOLIDATED_COMPONENTS,
    apply(db) {
      CONSOLIDATED_COMPONENTS.forEach((component) => recordComponent(db, '0049', component));
    },
  },
};

export function getSchemaMigrationHook(version: string): SchemaMigrationHook | undefined {
  return SCHEMA_MIGRATION_HOOKS[version];
}
