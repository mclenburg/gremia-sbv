import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import * as schema from '../../../services/appSchema';

type MigrationCase = {
  name: string;
  files: string[];
  tables: string[];
  indexes?: string[];
  required?: Record<string, readonly string[]>;
  partialTables?: string[];
};

function columns(db: DatabaseSync, table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => String(row.name));
}

function indexColumns(db: DatabaseSync, index: string): string[] {
  return db.prepare(`PRAGMA index_info(${index})`).all().map((row) => String(row.name));
}

function openFresh(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('database/schema.sql', 'utf8'));
  return db;
}

function openLegacy(files: string[]): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      CREATE TABLE cases (id TEXT PRIMARY KEY);
      CREATE TABLE case_measures (id TEXT PRIMARY KEY);
      CREATE TABLE case_documents (
        id TEXT PRIMARY KEY, case_id TEXT, imported_at TEXT, created_at TEXT, extracted_text TEXT, mime_type TEXT
      );
      CREATE TABLE generated_documents (id TEXT PRIMARY KEY);
      CREATE TABLE deadlines (id TEXT PRIMARY KEY);
      CREATE TABLE sbv_participations (id TEXT PRIMARY KEY);
      CREATE TABLE termination_hearings (id TEXT PRIMARY KEY);
      CREATE TABLE recruiting_participations (id TEXT PRIMARY KEY);
      CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT);
    `);
    for (const file of files) db.exec(readFileSync(`database/migrations/${file}`, 'utf8'));
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

const cases: MigrationCase[] = [
  { name: 'Verknüpfungen in Freitexten', files: ['0064_text_entity_references.sql'], tables: ['text_entity_references'], indexes: ['idx_text_entity_references_entity'], required: { text_entity_references: ['id', 'entity_kind', 'entity_id', 'label', 'marker', 'created_at'] } },
  { name: 'Fallmaßnahmennotizen', files: ['0026_case_measure_notes.sql'], tables: ['case_measure_notes'], indexes: ['idx_case_measure_notes_measure', 'idx_case_measure_notes_case'], required: { case_measure_notes: schema.CASE_MEASURE_NOTES_REQUIRED_COLUMNS } },
  { name: 'Fallsuchindex', files: ['0027_case_search_index.sql'], tables: ['case_search_index'], indexes: ['idx_case_search_index_case', 'idx_case_search_index_source', 'idx_case_search_index_navigation'], required: { case_search_index: schema.CASE_SEARCH_INDEX_REQUIRED_COLUMNS } },
  { name: 'Dokumenttext-Extraktion', files: ['0028_document_text_extraction_metadata.sql'], tables: ['case_documents'], required: { case_documents: ['extraction_quality', 'text_extraction_status', 'text_extracted_at'] }, partialTables: ['case_documents'] },
  { name: 'Dokumenttext-Diagnostik', files: ['0028_document_text_extraction_metadata.sql', '0030_document_text_extraction_diagnostics.sql'], tables: ['case_documents'], required: { case_documents: ['text_extractor_id', 'text_extraction_error'] }, partialTables: ['case_documents'] },
  { name: 'OCR-Hintergrundjobs', files: ['0028_document_text_extraction_metadata.sql', '0030_document_text_extraction_diagnostics.sql', '0031_document_ocr_background_jobs.sql'], tables: ['case_documents', 'case_document_ocr_jobs'], required: { case_documents: ['ocr_status', 'ocr_text', 'ocr_engine', 'ocr_started_at', 'ocr_completed_at', 'ocr_error'], case_document_ocr_jobs: schema.CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS }, partialTables: ['case_documents'] },
  { name: 'Fallsuchindex-Status', files: ['0029_case_search_index_state.sql'], tables: ['case_search_index_state'], required: { case_search_index_state: schema.CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS } },
  { name: 'Übergreifender Suchindex', files: ['0067_unified_search_index.sql'], tables: ['search_entries', 'search_entry_cases', 'search_change_clock', 'search_dirty_tables', 'search_index_build_state'], indexes: ['idx_search_entries_case', 'idx_search_entries_source', 'idx_search_entries_module', 'idx_search_entry_cases_case'], required: { search_entries: schema.SEARCH_ENTRIES_REQUIRED_COLUMNS, search_entry_cases: schema.SEARCH_ENTRY_CASES_REQUIRED_COLUMNS, search_change_clock: schema.SEARCH_CHANGE_CLOCK_REQUIRED_COLUMNS, search_dirty_tables: schema.SEARCH_DIRTY_TABLES_REQUIRED_COLUMNS, search_index_build_state: schema.SEARCH_INDEX_BUILD_STATE_REQUIRED_COLUMNS } },
  { name: 'Gremia.BR-Einstellungen', files: ['0032_gremia_br_settings.sql', '0034_gremia_br_relevance_settings.sql', '0053_gremia_br_v2_workspace_settings.sql', '0062_gremia_br_startup_refresh.sql'], tables: ['gremia_br_settings'], required: { gremia_br_settings: schema.GREMIA_BR_SETTINGS_REQUIRED_COLUMNS } },
  { name: 'Gremia.BR-Lesecache', files: ['0033_gremia_br_read_cache.sql'], tables: ['gremia_br_cache_entries'], indexes: ['idx_gremia_br_cache_entries_key', 'idx_gremia_br_cache_entries_fetched'], required: { gremia_br_cache_entries: schema.GREMIA_BR_CACHE_REQUIRED_COLUMNS } },
  { name: 'Gremia.BR-Arbeitsbereichsaktionen', files: ['0054_gremia_br_workspace_actions.sql'], tables: ['gremia_br_workspace_actions'], indexes: ['idx_gremia_br_workspace_actions_document', 'idx_gremia_br_workspace_actions_case', 'idx_gremia_br_workspace_actions_target'], required: { gremia_br_workspace_actions: schema.GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS } },
  { name: 'Gremia.BR-Fallanlagen', files: ['0063_gremia_br_case_creations.sql'], tables: ['gremia_br_case_creations'], required: { gremia_br_case_creations: schema.GREMIA_BR_CASE_CREATIONS_REQUIRED_COLUMNS } },
  { name: 'Transfer-Empfängerprofile', files: ['0056_transfer_recipient_profiles.sql'], tables: ['transfer_recipient_profiles'], indexes: ['idx_transfer_recipient_profiles_active_label'], required: { transfer_recipient_profiles: schema.TRANSFER_RECIPIENT_PROFILES_REQUIRED_COLUMNS } },
  { name: 'Mobile Begleitgeräte', files: ['0057_mobile_companion_devices.sql'], tables: ['mobile_companion_devices'], indexes: ['idx_mobile_companion_devices_status_label'], required: { mobile_companion_devices: schema.MOBILE_COMPANION_DEVICES_REQUIRED_COLUMNS } },
  { name: 'Importnachweise mobiler Änderungen', files: ['0058_mobile_companion_change_imports.sql'], tables: ['mobile_companion_change_imports'], indexes: ['idx_mobile_companion_change_imports_local'], required: { mobile_companion_change_imports: schema.MOBILE_COMPANION_CHANGE_IMPORTS_REQUIRED_COLUMNS } },
  { name: 'Externe Fallaktenreferenzen', files: ['0035_gremia_br_external_references.sql'], tables: ['case_external_references'], indexes: ['idx_case_external_references_case', 'idx_case_external_references_source'], required: { case_external_references: schema.CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS } },
  { name: 'Datenschutzvorfälle', files: ['0038_compliance_incidents.sql'], tables: ['compliance_incidents'], indexes: ['idx_compliance_incidents_status', 'idx_compliance_incidents_risk'], required: { compliance_incidents: schema.COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS } },
  { name: 'SBV-Steuerungsprotokolle', files: ['0039_sbv_control_protocols.sql', '0040_sbv_control_protocol_deadlines.sql'], tables: ['sbv_control_protocols'], indexes: ['idx_sbv_control_protocols_follow_up'], required: { sbv_control_protocols: schema.SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS } },
  { name: 'Tätigkeitsjournal', files: ['0041_activity_journal.sql'], tables: ['activity_journal_entries', 'activity_journal_links', 'activity_journal_category_preferences'], indexes: ['idx_activity_journal_entries_date', 'idx_activity_journal_links_target'], required: { activity_journal_entries: schema.ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, activity_journal_links: schema.ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, activity_journal_category_preferences: schema.ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS } },
  { name: 'Beteiligungsverstöße', files: ['0039_sbv_control_protocols.sql', '0041_activity_journal.sql', '0042_sbv_participation_violations.sql', '0044_participation_violation_measure_context.sql', '0047_participation_violation_recruiting_context.sql'], tables: ['sbv_participation_violations', 'sbv_participation_violation_events', 'sbv_participation_violation_documents'], indexes: ['idx_sbv_participation_violations_status', 'idx_sbv_participation_violations_source', 'idx_sbv_participation_violation_events_violation'], required: { sbv_participation_violations: schema.SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, sbv_participation_violation_events: schema.SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, sbv_participation_violation_documents: schema.SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS } },
];

describe('Frischinstallation und ausführbare Legacy-Migrationen', () => {
  it.each(cases)('$name erzeugt das aktuelle Tabellenschema', ({ files, tables, indexes = [], required = {}, partialTables = [] }) => {
    const fresh = openFresh();
    const migrated = openLegacy(files);
    try {
      for (const table of tables) {
        const actual = columns(migrated, table);
        const expected = columns(fresh, table);
        expect(actual.length, table).toBeGreaterThan(0);
        if (!partialTables.includes(table)) expect(actual.sort(), table).toEqual(expected.sort());
        expect(actual, table).toEqual(expect.arrayContaining([...(required[table] ?? [])]));
        expect(expected, table).toEqual(expect.arrayContaining([...(required[table] ?? [])]));
      }
      for (const index of indexes) {
        const actual = indexColumns(migrated, index);
        expect(actual.length, index).toBeGreaterThan(0);
        expect(actual, index).toEqual(indexColumns(fresh, index));
      }
    } finally {
      fresh.close();
      migrated.close();
    }
  });

  it('verknüpft Beteiligungsverstöße nach Migration 0044 mit Fallmaßnahmen und erlaubt den neuen Ursprungskontext', () => {
    const db = openLegacy(['0039_sbv_control_protocols.sql', '0041_activity_journal.sql', '0042_sbv_participation_violations.sql', '0044_participation_violation_measure_context.sql']);
    try {
      expect(db.prepare('PRAGMA foreign_key_list(sbv_participation_violations)').all())
        .toEqual(expect.arrayContaining([expect.objectContaining({ from: 'related_case_measure_id', table: 'case_measures', on_delete: 'SET NULL' })]));
      db.exec(`INSERT INTO sbv_participation_violations
        (id, stage, status, violation_type, source_context_type, source_context_id, subject,
         measure_description, wrong_behavior, required_behavior, created_at, updated_at)
        VALUES ('violation-1', 'request', 'draft', 'not_informed', 'case_measure_participation',
          'measure-1', 'Betreff', 'Maßnahme', 'Verhalten', 'Erwartung', '2026-01-01', '2026-01-01')`);
      expect(db.prepare('SELECT source_context_type FROM sbv_participation_violations WHERE id = ?').get('violation-1'))
        .toEqual({ source_context_type: 'case_measure_participation' });
    } finally {
      db.close();
    }
  });
});
