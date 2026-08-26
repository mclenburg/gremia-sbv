import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from '../appSchema.js';
import { MigrationProcessSchemasA } from './migrationProcessSchemasA.js';

export class MigrationProcessSchemasB extends MigrationProcessSchemasA {
  protected hasCompleteProtectedPerson091Schema(): boolean {
      return this.tableExists('protected_persons')
        && this.tableExists('person_import_runs')
        && this.tableExists('person_import_run_items')
        && this.tableExists('person_case_links')
        && this.tableExists('privacy_review_items')
        && PROTECTED_PERSONS_REQUIRED_COLUMNS.every((column) => this.columnExists('protected_persons', column))
        && PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('person_import_run_items', column))
        && CASES_REQUIRED_COLUMNS.every((column) => this.columnExists('cases', column))
        && this.columnExists('cases', 'privacy_review_priority')
        && this.columnExists('cases', 'anonymization_recommended')
        && this.columnExists('cases', 'anonymized_at');
    }

  protected ensureProtectedPerson091Schema(): void {
    this.createProtectedPersonTables();
    this.ensureProtectedPersonColumns();
    this.ensureProtectedPersonIndexesAndPrivacyReview();
  }

  private createProtectedPersonTables(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS protected_persons (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          record_kind TEXT NOT NULL DEFAULT 'identified_person' CHECK (record_kind IN ('identified_person','pseudonymous_request')),
          pseudonym_label TEXT,
          first_name TEXT NOT NULL DEFAULT '',
          last_name TEXT NOT NULL DEFAULT '',
          personnel_number TEXT,
          work_email TEXT,
          organizational_unit TEXT,
          location TEXT,
          employment_state TEXT NOT NULL DEFAULT 'active_employee' CHECK (employment_state IN ('active_employee', 'left_company', 'unknown')),
          left_company_at TEXT,
          left_company_reason TEXT,
          protection_status TEXT NOT NULL DEFAULT 'unclear' CHECK (protection_status IN ('severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive')),
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
          source_file_name TEXT NOT NULL DEFAULT '',
          source_file_hash TEXT NOT NULL DEFAULT '',
          imported_at TEXT NOT NULL DEFAULT (datetime('now')),
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
          match_strategy TEXT CHECK (match_strategy IN ('personnel_number', 'work_email', 'name_exact_unique', 'name_only_conflict', 'none')),
          conflict_reason TEXT,
          validation_message TEXT,
          changed_fields_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL
        );
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
      `);
  }

  private ensureProtectedPersonColumns(): void {
      this.addColumnIfMissing('protected_persons', 'record_kind', "TEXT NOT NULL DEFAULT 'identified_person'");
      this.addColumnIfMissing('protected_persons', 'pseudonym_label', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'employment_state', "TEXT NOT NULL DEFAULT 'active_employee'");
      this.addColumnIfMissing('protected_persons', 'left_company_at', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'left_company_reason', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'protection_status', "TEXT NOT NULL DEFAULT 'unclear'");
      this.addColumnIfMissing('protected_persons', 'status_source', "TEXT NOT NULL DEFAULT 'unknown'");
      this.addColumnIfMissing('protected_persons', 'lifecycle_state', "TEXT NOT NULL DEFAULT 'active'");
      this.addColumnIfMissing('protected_persons', 'status_valid_from', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'status_valid_until', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'evidence_checked_at', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'expiry_warning_created_at', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'expiry_review_due_at', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'retention_reason', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'retention_review_at', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'anonymized_at', 'TEXT');
      this.addColumnIfMissing('protected_persons', 'anonymization_reason', 'TEXT');
  
      this.addColumnIfMissing('cases', 'protected_person_id', 'TEXT REFERENCES protected_persons(id) ON DELETE SET NULL');
      this.addColumnIfMissing('cases', 'person_binding_state', "TEXT NOT NULL DEFAULT 'legacy_unlinked'");
      this.addColumnIfMissing('cases', 'privacy_review_required', 'INTEGER NOT NULL DEFAULT 0');
      this.addColumnIfMissing('cases', 'privacy_review_reason', 'TEXT');
      this.addColumnIfMissing('cases', 'privacy_review_due_at', 'TEXT');
      this.addColumnIfMissing('cases', 'privacy_review_priority', "TEXT NOT NULL DEFAULT 'normal'");
      this.addColumnIfMissing('cases', 'anonymization_recommended', 'INTEGER NOT NULL DEFAULT 0');
      this.addColumnIfMissing('cases', 'anonymized_at', 'TEXT');
  }

  private ensureProtectedPersonIndexesAndPrivacyReview(): void {
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_protected_persons_name ON protected_persons(last_name, first_name);
        CREATE INDEX IF NOT EXISTS idx_protected_persons_personnel_number ON protected_persons(personnel_number);
        CREATE INDEX IF NOT EXISTS idx_protected_persons_work_email ON protected_persons(work_email);
        CREATE INDEX IF NOT EXISTS idx_protected_persons_status_until ON protected_persons(status_valid_until);
        CREATE INDEX IF NOT EXISTS idx_protected_persons_lifecycle ON protected_persons(lifecycle_state);
        CREATE INDEX IF NOT EXISTS idx_protected_persons_employment ON protected_persons(employment_state, left_company_at);
        CREATE INDEX IF NOT EXISTS idx_person_import_items_run ON person_import_run_items(run_id, row_number);
        CREATE INDEX IF NOT EXISTS idx_person_import_items_person ON person_import_run_items(protected_person_id);
        CREATE INDEX IF NOT EXISTS idx_person_case_links_person ON person_case_links(protected_person_id);
        CREATE INDEX IF NOT EXISTS idx_person_case_links_case ON person_case_links(case_file_id);
        CREATE INDEX IF NOT EXISTS idx_person_case_links_state ON person_case_links(link_state);
        CREATE INDEX IF NOT EXISTS idx_cases_protected_person ON cases(protected_person_id);
        CREATE INDEX IF NOT EXISTS idx_cases_person_binding_state ON cases(person_binding_state);
        CREATE INDEX IF NOT EXISTS idx_cases_privacy_review ON cases(privacy_review_required, privacy_review_due_at);
        CREATE TABLE IF NOT EXISTS privacy_review_items (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
          reason TEXT NOT NULL,
          priority TEXT NOT NULL,
          due_at TEXT NOT NULL,
          free_text_review_required INTEGER NOT NULL DEFAULT 1,
          context_json TEXT NOT NULL DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','cleared','anonymized','deleted','retention_documented')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_privacy_review_items_case ON privacy_review_items(case_id, status);
        CREATE INDEX IF NOT EXISTS idx_privacy_review_items_person ON privacy_review_items(protected_person_id, status);
      `);
  }

  protected ensureCaseMeasureSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS case_measures (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          risk_level TEXT NOT NULL DEFAULT 'normal',
          created_from TEXT NOT NULL DEFAULT 'manual',
          summary TEXT,
          next_step TEXT,
          due_at TEXT,
          opened_at TEXT NOT NULL,
          closed_at TEXT,
          requires_follow_up INTEGER NOT NULL DEFAULT 0,
          source_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          handover_import_id TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL,
          handover_package_id TEXT,
          handover_valid_until TEXT,
          handover_status TEXT NOT NULL DEFAULT 'none',
          handover_continue_confirmed_at TEXT,
          handover_continue_reason TEXT,
          FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS case_measure_participation (
          measure_id TEXT PRIMARY KEY,
          employer_measure_type TEXT NOT NULL DEFAULT 'sonstiges',
          person_status TEXT NOT NULL DEFAULT 'unklar',
          decision_stage TEXT NOT NULL DEFAULT 'unklar',
          participation_status TEXT NOT NULL DEFAULT 'neu',
          sbv_knowledge_at TEXT,
          employer_information_at TEXT,
          hearing_requested_at TEXT,
          sbv_statement_due_at TEXT,
          sbv_statement_submitted_at TEXT,
          employer_decision_at TEXT,
          implementation_at TEXT,
          information_complete INTEGER NOT NULL DEFAULT 0,
          hearing_before_decision INTEGER NOT NULL DEFAULT 0,
          decision_notified INTEGER NOT NULL DEFAULT 0,
          suspension_requested_at TEXT,
          suspension_deadline_at TEXT,
          violation_summary TEXT,
          sbv_position TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS case_measure_events (
          id TEXT PRIMARY KEY,
          measure_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_case_measures_case ON case_measures(case_id, type, status);
        CREATE INDEX IF NOT EXISTS idx_case_measures_type_status ON case_measures(type, status);
        CREATE INDEX IF NOT EXISTS idx_case_measures_due ON case_measures(due_at);
        CREATE INDEX IF NOT EXISTS idx_case_measures_source ON case_measures(source_id);
  CREATE INDEX IF NOT EXISTS idx_case_measures_follow_up ON case_measures(case_id, requires_follow_up, status);
        CREATE INDEX IF NOT EXISTS idx_case_measure_participation_status ON case_measure_participation(participation_status);
        CREATE INDEX IF NOT EXISTS idx_case_measure_participation_statement_due ON case_measure_participation(sbv_statement_due_at);
        CREATE INDEX IF NOT EXISTS idx_case_measure_participation_suspension_due ON case_measure_participation(suspension_deadline_at);
  CREATE INDEX IF NOT EXISTS idx_case_measure_events_measure_created ON case_measure_events(measure_id, created_at);
      `);
      this.ensureCaseMeasureHandoverColumns();
      this.ensureCaseMeasureNoteSchema();
    }


  protected ensureCaseMeasureNoteSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS case_measure_notes (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          measure_type TEXT NOT NULL CHECK (measure_type IN ('prevention','bem','termination_hearing','equalization','participation','workplace_accommodation')),
          measure_id TEXT NOT NULL,
          title TEXT NOT NULL,
          note_at TEXT NOT NULL,
          participants TEXT,
          content TEXT NOT NULL,
          next_steps TEXT,
          contains_health_data INTEGER NOT NULL DEFAULT 1,
          confidential_level TEXT NOT NULL DEFAULT 'sensibel' CHECK (confidential_level IN ('normal','sensibel','hoch_sensibel')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_case_measure_notes_measure ON case_measure_notes(measure_type, measure_id, note_at DESC);
        CREATE INDEX IF NOT EXISTS idx_case_measure_notes_case ON case_measure_notes(case_id, note_at DESC);
      `);
    }

  protected ensureWorkplaceAccommodationSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS case_measure_workplace_accommodation (
          measure_id TEXT PRIMARY KEY,
          category TEXT NOT NULL DEFAULT 'sonstiges',
          accommodation_status TEXT NOT NULL DEFAULT 'entwurf',
          requested_adjustment TEXT NOT NULL DEFAULT '',
          legal_basis TEXT NOT NULL DEFAULT '§ 164 Abs. 4 SGB IX',
          barrier_or_limitation TEXT,
          workplace_context TEXT,
          proposed_solution TEXT,
          technical_aid_needed INTEGER NOT NULL DEFAULT 0,
          organizational_adjustment_needed INTEGER NOT NULL DEFAULT 0,
          working_time_adjustment_needed INTEGER NOT NULL DEFAULT 0,
          qualification_needed INTEGER NOT NULL DEFAULT 0,
          fixed_workplace_needed INTEGER NOT NULL DEFAULT 0,
          homeoffice_or_mobile_work_relevant INTEGER NOT NULL DEFAULT 0,
          inclusion_office_involved INTEGER NOT NULL DEFAULT 0,
          rehab_carrier_involved INTEGER NOT NULL DEFAULT 0,
          employer_response_status TEXT NOT NULL DEFAULT 'offen',
          employer_response_at TEXT,
          implementation_status TEXT NOT NULL DEFAULT 'nicht_begonnen',
          implementation_due_at TEXT,
          effectiveness_review_at TEXT,
          outcome TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_status ON case_measure_workplace_accommodation(accommodation_status);
        CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_category ON case_measure_workplace_accommodation(category);
        CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_review ON case_measure_workplace_accommodation(effectiveness_review_at);
      `);
    }
}
