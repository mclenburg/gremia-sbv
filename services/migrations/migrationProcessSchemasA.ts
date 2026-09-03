import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from '../appSchema.js';
import { MigrationExecutor } from './migrationExecutor.js';

export class MigrationProcessSchemasA extends MigrationExecutor {
  protected hasCompleteRecruitingParticipationSchema(): boolean {
      return this.tableExists('recruiting_participations')
        && this.tableExists('recruiting_interview_events')
        && RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS.every((column) => this.columnExists('recruiting_participations', column))
        && RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('recruiting_interview_events', column));
    }

  protected ensureRecruitingParticipationSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS recruiting_participations (
          id TEXT PRIMARY KEY,
          vacancy_title TEXT NOT NULL,
          vacancy_reference TEXT,
          department TEXT,
          location TEXT,
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','notice_received','interviews_scheduled','interviews_completed','hearing_pending','statement_submitted','decision_known','closed')),
          employer_notice_date TEXT,
          documents_received_date TEXT,
          documents_complete INTEGER NOT NULL DEFAULT 0 CHECK (documents_complete IN (0,1)),
          has_severely_disabled_applicants INTEGER NOT NULL DEFAULT 0 CHECK (has_severely_disabled_applicants IN (0,1)),
          severely_disabled_applicant_count INTEGER,
          interview_count INTEGER NOT NULL DEFAULT 0,
          sbv_invited_to_all_known_interviews INTEGER CHECK (sbv_invited_to_all_known_interviews IN (0,1)),
          sbv_participated INTEGER CHECK (sbv_participated IN (0,1)),
          hearing_requested_date TEXT,
          hearing_due_date TEXT,
          statement_submitted_date TEXT,
          decision_known_date TEXT,
          decision_before_hearing INTEGER NOT NULL DEFAULT 0 CHECK (decision_before_hearing IN (0,1)),
          br_procedure_date TEXT,
          flagged_for_violation_review INTEGER NOT NULL DEFAULT 0 CHECK (flagged_for_violation_review IN (0,1)),
          violation_review_reason TEXT CHECK (violation_review_reason IS NULL OR violation_review_reason IN ('decision_before_hearing','missing_hearing_after_interview','incomplete_information','sbv_not_invited','execution_without_remedy','manual_review')),
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS recruiting_interview_events (
          id TEXT PRIMARY KEY,
          recruiting_participation_id TEXT NOT NULL REFERENCES recruiting_participations(id) ON DELETE CASCADE,
          interview_date TEXT NOT NULL,
          applicant_ref TEXT NOT NULL,
          applicant_reference_mode TEXT NOT NULL DEFAULT 'anonymous_reference' CHECK (applicant_reference_mode IN ('anonymous_reference','pseudonymized_reference','clear_name')),
          applicant_status TEXT NOT NULL DEFAULT 'unknown_or_not_relevant' CHECK (applicant_status IN ('severely_disabled','equal_status','unknown_or_not_relevant')),
          sbv_invited INTEGER NOT NULL DEFAULT 0 CHECK (sbv_invited IN (0,1)),
          sbv_invitation_date TEXT,
          sbv_attended INTEGER NOT NULL DEFAULT 0 CHECK (sbv_attended IN (0,1)),
          accessibility_check_status TEXT NOT NULL DEFAULT 'not_checked' CHECK (accessibility_check_status IN ('not_checked','not_relevant','contact_offered','format_checked','follow_up_needed')),
          follow_up_needed INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_needed IN (0,1)),
          procedural_note TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_recruiting_participations_status ON recruiting_participations(status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_recruiting_participations_notice ON recruiting_participations(employer_notice_date DESC);
        CREATE INDEX IF NOT EXISTS idx_recruiting_participations_hearing ON recruiting_participations(hearing_due_date, status);
        CREATE INDEX IF NOT EXISTS idx_recruiting_participations_violation_flag ON recruiting_participations(flagged_for_violation_review, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_recruiting_participations_reference ON recruiting_participations(vacancy_reference);
        CREATE INDEX IF NOT EXISTS idx_recruiting_interviews_participation ON recruiting_interview_events(recruiting_participation_id, interview_date);
        CREATE INDEX IF NOT EXISTS idx_recruiting_interviews_accessibility ON recruiting_interview_events(accessibility_check_status, follow_up_needed);
      `);
    }

  protected hasCompleteActivityJournalSchema(): boolean {
      return this.tableExists('activity_journal_entries')
        && this.tableExists('activity_journal_links')
        && this.tableExists('activity_journal_category_preferences')
        && ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_entries', column))
        && ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_links', column))
        && ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_category_preferences', column));
    }

  protected ensureActivityJournalSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS activity_journal_entries (
          id TEXT PRIMARY KEY,
          entry_date TEXT NOT NULL,
          started_at TEXT NULL,
          ended_at TEXT NULL,
          duration_minutes INTEGER NULL,
          time_mode TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NULL,
          result_note TEXT NULL,
          confidentiality_level TEXT NOT NULL,
          status TEXT NOT NULL,
          created_from TEXT NOT NULL,
          follow_up_due_at TEXT NULL,
          performed_outside_contract_work_time INTEGER NOT NULL DEFAULT 0,
          exported_for_activity_report_at TEXT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK(time_mode IN ('none','duration','range','timer')),
          CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
          CHECK(confidentiality_level IN ('normal','confidential','highly_confidential')),
          CHECK(status IN ('draft','final','follow_up_open')),
          CHECK(created_from IN ('manual','text_command','context_prefill','timer','import')),
          CHECK(duration_minutes IS NULL OR duration_minutes >= 0),
          CHECK(performed_outside_contract_work_time IN (0,1))
        );
        CREATE TABLE IF NOT EXISTS activity_journal_links (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES activity_journal_entries(id) ON DELETE CASCADE,
          target_type TEXT NOT NULL CHECK(target_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','recruiting_participation','recruiting_interview','deadline','document')),
          target_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(entry_id, target_type, target_id)
        );
        CREATE TABLE IF NOT EXISTS activity_journal_category_preferences (
          context_type TEXT PRIMARY KEY CHECK(context_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','recruiting_participation','recruiting_interview','deadline','document','journal','fallfrei')),
          category TEXT NOT NULL CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_date ON activity_journal_entries(entry_date DESC, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_category ON activity_journal_entries(category, entry_date DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_status ON activity_journal_entries(status, entry_date DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_follow_up ON activity_journal_entries(follow_up_due_at);
        CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_exported ON activity_journal_entries(exported_for_activity_report_at);
        CREATE INDEX IF NOT EXISTS idx_activity_journal_links_entry ON activity_journal_links(entry_id);
        CREATE INDEX IF NOT EXISTS idx_activity_journal_links_target ON activity_journal_links(target_type, target_id);
      `);
    }

  protected hasCompleteCaseHandoverSchema(): boolean {
      return this.tableExists('case_handover_imports')
        && this.tableExists('case_handover_import_items')
        && CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_imports', column))
        && CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_import_items', column))
        && ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'].every((column) => this.columnExists('cases', column))
        && CASE_MEASURES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measures', column));
    }

  protected ensureCaseHandoverSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS case_handover_imports (
          id TEXT PRIMARY KEY,
          package_id TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          valid_until TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          mode TEXT NOT NULL DEFAULT 'create_new',
          created_case_count INTEGER NOT NULL DEFAULT 0,
          updated_case_count INTEGER NOT NULL DEFAULT 0,
          metadata_json TEXT NOT NULL DEFAULT '{}'
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_case_handover_package ON case_handover_imports(package_id);
        CREATE TABLE IF NOT EXISTS case_handover_import_items (
          id TEXT PRIMARY KEY,
          handover_import_id TEXT NOT NULL REFERENCES case_handover_imports(id) ON DELETE CASCADE,
          local_entity_type TEXT NOT NULL,
          local_entity_id TEXT NOT NULL,
          package_ref TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_case_handover_items_local ON case_handover_import_items(local_entity_type, local_entity_id);
      `);
      this.addColumnIfMissing('cases', 'handover_import_id', 'TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL');
      this.addColumnIfMissing('cases', 'handover_package_id', 'TEXT');
      this.addColumnIfMissing('cases', 'handover_valid_until', 'TEXT');
      this.addColumnIfMissing('cases', 'handover_status', "TEXT NOT NULL DEFAULT 'none'");
      this.addColumnIfMissing('cases', 'handover_continue_confirmed_at', 'TEXT');
      this.addColumnIfMissing('cases', 'handover_continue_reason', 'TEXT');
      this.ensureCaseMeasureHandoverColumns();
    }

  protected ensureDocumentOcrSchema(): void {
      if (this.tableExists('case_documents')) {
        this.addColumnIfMissing('case_documents', 'ocr_status', "TEXT NOT NULL DEFAULT 'not_required'");
        this.addColumnIfMissing('case_documents', 'ocr_text', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_engine', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_started_at', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_completed_at', 'TEXT');
        this.addColumnIfMissing('case_documents', 'ocr_error', 'TEXT');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_case_documents_ocr_status ON case_documents(ocr_status, imported_at);');
      }
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS case_document_ocr_jobs (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES case_documents(id) ON DELETE CASCADE,
          case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','unsupported','failed')),
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_document ON case_document_ocr_jobs(document_id);
        CREATE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_status ON case_document_ocr_jobs(status, updated_at);
      `);
    }

  protected ensureCaseSearchIndexSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS case_search_index (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          case_number TEXT,
          source_type TEXT NOT NULL,
          source_id TEXT NOT NULL,
          source_label TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          keywords TEXT,
          occurred_at TEXT,
          updated_at TEXT NOT NULL,
          confidentiality TEXT NOT NULL DEFAULT 'sensibel',
          contains_health_data INTEGER NOT NULL DEFAULT 1,
          extraction_quality TEXT NOT NULL DEFAULT 'structured',
          navigation_kind TEXT NOT NULL,
          navigation_id TEXT NOT NULL,
          navigation_sub_id TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(source_type, source_id, case_id)
        );
        CREATE INDEX IF NOT EXISTS idx_case_search_index_case ON case_search_index(case_id, updated_at);
        CREATE INDEX IF NOT EXISTS idx_case_search_index_source ON case_search_index(source_type, source_id);
        CREATE INDEX IF NOT EXISTS idx_case_search_index_navigation ON case_search_index(navigation_kind, navigation_id);
        CREATE TABLE IF NOT EXISTS case_search_index_state (
          case_id TEXT PRIMARY KEY,
          indexed_at TEXT NOT NULL,
          last_source_updated_at TEXT,
          source_count INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS case_search_index_fts USING fts5(
          index_id UNINDEXED,
          title,
          content,
          keywords,
          source_label,
          tokenize = 'unicode61 remove_diacritics 2'
        );
      `);
    }

  protected ensureCaseMeasureHandoverColumns(): void {
      this.addColumnIfMissing('case_measures', 'handover_import_id', 'TEXT REFERENCES case_handover_imports(id) ON DELETE SET NULL');
      this.addColumnIfMissing('case_measures', 'handover_package_id', 'TEXT');
      this.addColumnIfMissing('case_measures', 'handover_valid_until', 'TEXT');
      this.addColumnIfMissing('case_measures', 'handover_status', "TEXT NOT NULL DEFAULT 'none'");
      this.addColumnIfMissing('case_measures', 'handover_continue_confirmed_at', 'TEXT');
      this.addColumnIfMissing('case_measures', 'handover_continue_reason', 'TEXT');
    }

}
