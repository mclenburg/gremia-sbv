import type { DatabaseAdapter } from './databaseService.js';

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
