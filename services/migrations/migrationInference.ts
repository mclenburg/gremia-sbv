import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS, SBV_OFFICE_0051_REQUIRED_TABLES, DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS } from '../appSchema.js';
import { MigrationCore } from './migrationCore.js';
import { nowIso } from './migrationSupport.js';

export class MigrationInference extends MigrationCore {
  protected inferAlreadyAppliedMigrations(inferred: string[]): void {
      const definitions = this.listMigrationDefinitions();
      definitions.forEach((definition) => {
        if (this.hasMigration(definition.version)) return;
        if (!this.looksApplied(definition.version)) return;
        this.recordMigration(definition, 'inferred', 'Migration wurde aus vorhandener Datenbankstruktur erkannt und nachträglich als angewendet markiert.');
        inferred.push(definition.filename);
      });
    }

  protected looksApplied(version: string): boolean {
    return version < '0025'
      ? this.looksAppliedLegacy(version)
      : this.looksAppliedCurrent(version);
  }

  private looksAppliedLegacy(version: string): boolean {
    switch (version) {

        case '0002':
          return this.tableExists('bem_processes') && this.tableExists('termination_hearings') && this.tableExists('portable_profile');
        case '0003':
          return this.tableExists('deadline_templates') && this.columnExists('deadlines', 'deadline_type') && this.columnExists('deadlines', 'confidential_title');
        case '0004':
          return this.tableExists('case_notes_fts') && this.tableExists('case_documents_fts');
        case '0005':
          return this.indexExists('idx_case_documents_case_id');
        case '0006':
          return this.tableExists('case_note_cases');
        case '0007':
          return this.tableExists('contacts') && this.columnExists('contacts', 'first_name') && this.columnExists('contacts', 'last_name');
        case '0008':
          return this.tableExists('contact_text_references');
        case '0009':
          return this.tableExists('schema_migrations');
        case '0010':
          return this.tableExists('report_exports');
        case '0011':
          return this.tableExists('retention_actions');
        case '0012':
          return this.tableExists('prevention_processes') && this.tableExists('prevention_process_contacts');
        case '0013':
          return this.tableExists('legal_norms') && this.tableExists('case_legal_references') && this.columnExists('case_legal_references', 'legal_norm_id') && this.tableExists('norm_checklist_items');
        case '0014':
          return this.tableExists('document_templates') && this.tableExists('template_renders');
        case '0015':
          return this.tableExists('bem_processes')
            && this.columnExists('bem_processes', 'status')
            && this.columnExists('bem_processes', 'title')
            && this.columnExists('bem_processes', 'employee_response')
            && this.tableExists('bem_process_contacts')
            && this.tableExists('bem_process_events');
        case '0016':
          return this.columnExists('bem_processes', 'privacy_notice_at')
            && this.columnExists('bem_processes', 'consent_scope')
            && this.columnExists('bem_processes', 'measure_owners')
            && this.columnExists('bem_processes', 'completion_reason');
        case '0017':
          return this.tableExists('termination_hearings')
            && this.columnExists('termination_hearings', 'status')
            && this.columnExists('termination_hearings', 'received_at')
            && this.columnExists('termination_hearings', 'protection_status')
            && this.indexExists('idx_termination_hearings_status');
        case '0018':
          return this.tableExists('personal_data_audit_log')
            && this.columnExists('personal_data_audit_log', 'entry_hash')
            && this.indexExists('idx_personal_data_audit_action');
        case '0019':
          return this.tableExists('sbv_participations')
            && this.columnExists('sbv_participations', 'hearing_before_decision')
            && this.indexExists('idx_sbv_participations_status');
      default:
        return false;
    }
  }

  private looksAppliedCurrent(version: string): boolean {
    switch (version) {
        case '0025':
          return this.tableExists('protected_persons')
            && this.tableExists('person_import_runs')
            && this.tableExists('person_import_run_items')
            && this.tableExists('person_case_links')
            && this.tableExists('privacy_review_items')
            && this.columnExists('protected_persons', 'left_company_at')
            && this.columnExists('protected_persons', 'record_kind')
            && this.columnExists('cases', 'protected_person_id')
            && this.columnExists('cases', 'person_binding_state')
            && this.columnExists('cases', 'privacy_review_required');
        case '0026':
          return this.tableExists('case_measure_notes')
            && this.columnExists('case_measure_notes', 'measure_type')
            && this.columnExists('case_measure_notes', 'measure_id')
            && this.columnExists('case_measure_notes', 'content');
        case '0027':
          return this.tableExists('case_search_index')
            && this.tableExists('case_search_index_fts')
            && CASE_SEARCH_INDEX_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index', column));
        case '0028':
          return CASE_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_documents', column));
        case '0029':
          return this.tableExists('case_search_index_state')
            && CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index_state', column));
        case '0030':
          return CASE_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_documents', column));
        case '0031':
          return CASE_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_documents', column))
            && this.tableExists('case_document_ocr_jobs')
            && CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_document_ocr_jobs', column));
        case '0032':
          return this.tableExists('gremia_br_settings')
            && GREMIA_BR_SETTINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_settings', column));
        case '0033':
          return this.tableExists('gremia_br_cache_entries')
            && GREMIA_BR_CACHE_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_cache_entries', column));
        case '0034':
          return this.tableExists('gremia_br_settings')
            && GREMIA_BR_SETTINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_settings', column));
        case '0035':
          return this.tableExists('case_external_references')
            && CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_external_references', column));
        case '0036':
          return this.tableExists('case_handover_imports')
            && this.tableExists('case_handover_import_items')
            && CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_imports', column))
            && CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_import_items', column))
            && ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'].every((column) => this.columnExists('cases', column))
            && ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'].every((column) => this.columnExists('case_measures', column));
        case '0037':
          return this.tableExists('sbv_resource_records')
            && SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_resource_records', column));
        case '0038':
          return this.tableExists('compliance_incidents')
            && COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('compliance_incidents', column));
        case '0039':
          return this.tableExists('sbv_control_protocols')
            && ['id', 'title', 'partner', 'topic', 'meeting_at', 'participants', 'legal_context', 'discussion', 'result', 'next_steps', 'status', 'created_at', 'updated_at'].every((column) => this.columnExists('sbv_control_protocols', column));
        case '0040':
          return this.tableExists('sbv_control_protocols')
            && SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_control_protocols', column));
        case '0041':
          return this.tableExists('activity_journal_entries')
            && this.tableExists('activity_journal_links')
            && this.tableExists('activity_journal_category_preferences')
            && ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_entries', column))
            && ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_links', column))
            && ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS.every((column) => this.columnExists('activity_journal_category_preferences', column));
        case '0042':
          return this.tableExists('sbv_participation_violations')
            && this.tableExists('sbv_participation_violation_events')
            && this.tableExists('sbv_participation_violation_documents')
            && SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participation_violations', column))
            && SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participation_violation_events', column))
            && SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participation_violation_documents', column));
        case '0043':
          return GENERATED_DOCUMENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('generated_documents', column));
        case '0044':
          return this.columnExists('sbv_participation_violations', 'related_case_measure_id');
        case '0045':
          return this.tableExists('recruiting_participations')
            && this.tableExists('recruiting_interview_events')
            && RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS.every((column) => this.columnExists('recruiting_participations', column))
            && RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS.every((column) => this.columnExists('recruiting_interview_events', column));
        case '0046':
          return this.activityJournalRecruitingContextsSupported();
        case '0047':
          return this.participationViolationRecruitingContextSupported();
        case '0048':
          return this.indexExists('idx_personal_data_audit_lifecycle_period');
        case '0049':
          return this.tableExists('schema_migration_components')
            && Boolean(this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM schema_migration_components WHERE migration_version = ?').get('0049')?.count);
        case '0050': {
          const sql = this.db.prepare<{ sql: string | null }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'case_note_links'").get()?.sql ?? '';
          return sql.includes('prevention') && sql.includes('termination_hearing') && sql.includes('equalization') && sql.includes('workplace_accommodation');
        }
        case '0051':
          return Object.entries(SBV_OFFICE_0051_REQUIRED_TABLES).every(([table, columns]) =>
            this.tableExists(table) && columns.every((column) => this.columnExists(table, column))
          ) && DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS.every((column) => this.columnExists('deadlines', column));
      default:
        return false;
    }
  }

  protected activityJournalRecruitingContextsSupported(): boolean {
      if (!this.tableExists('activity_journal_links') || !this.tableExists('activity_journal_category_preferences') || !this.tableExists('activity_journal_entries')) return false;
      try {
        const entryId = `migration-check-${Date.now()}`;
        const linkId = `${entryId}-link`;
        const timestamp = nowIso();
        this.db.exec('BEGIN');
        this.db.prepare(`
          INSERT INTO activity_journal_entries (
            id, entry_date, started_at, ended_at, duration_minutes, time_mode, category,
            title, description, result_note, confidentiality_level, status, created_from,
            follow_up_due_at, performed_outside_contract_work_time, exported_for_activity_report_at,
            created_at, updated_at
          ) VALUES (?, ?, NULL, NULL, NULL, 'none', 'participation', ?, NULL, NULL, 'confidential', 'draft', 'context_prefill', NULL, 0, NULL, ?, ?)
        `).run(entryId, new Date().toISOString().slice(0, 10), 'Schema-Check Recruiting-Kontext', timestamp, timestamp);
        this.db.prepare('INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(linkId, entryId, 'recruiting_participation', 'schema-check-target', timestamp);
        this.db.prepare('DELETE FROM activity_journal_entries WHERE id = ?').run(entryId);
        this.db.exec('COMMIT');
        return true;
      } catch (_error) {
        try { this.db.exec('ROLLBACK'); } catch {}
        return false;
      }
    }

  protected participationViolationRecruitingContextSupported(): boolean {
      if (!this.tableExists('sbv_participation_violations')) return false;
      if (!this.columnExists('sbv_participation_violations', 'related_recruiting_participation_id')) return false;
      try {
        const violationId = `migration-check-${Date.now()}`;
        const timestamp = nowIso();
        this.db.exec('BEGIN');
        this.db.prepare(`
          INSERT INTO sbv_participation_violations (
            id, stage, status, violation_type, source_context_type, source_context_id,
            subject, measure_description, wrong_behavior, required_behavior,
            legal_basis, created_at, updated_at
          ) VALUES (?, 'request', 'draft', 'incomplete_information', 'recruiting_participation', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          violationId,
          'schema-check-recruiting',
          'Schema-Check Stellenbesetzung',
          'Prüfung des Recruiting-Kontexts',
          'Keine produktive Bewertung',
          'Nur Schema-Check',
          '§ 178 Abs. 2 SGB IX',
          timestamp,
          timestamp,
        );
        this.db.prepare('DELETE FROM sbv_participation_violations WHERE id = ?').run(violationId);
        this.db.exec('COMMIT');
        return true;
      } catch (_error) {
        try { this.db.exec('ROLLBACK'); } catch {}
        return false;
      }
    }
}
