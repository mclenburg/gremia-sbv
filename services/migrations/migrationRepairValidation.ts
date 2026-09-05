import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { repairPersonImportRunItemMatchStrategySchema } from '../personImportRunItemSchemaRepair.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_EXPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_EXPORT_ITEMS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS, SBV_OFFICE_0051_REQUIRED_TABLES, DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS } from '../appSchema.js';
import { ensureCaseHandoverExportLedgerSchema } from '../caseHandoverExportLedger.js';
import { MigrationProcessSchemasD } from './migrationProcessSchemasD.js';

export class MigrationRepairValidation extends MigrationProcessSchemasD {
  protected repairKnownSchemaDrift(diagnostics: string[]): void {
      if (!this.tableExists('termination_hearings') || !TERMINATION_HEARINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('termination_hearings', column))) {
        this.rebuildTerminationHearingsTable();
        diagnostics.push('Kündigungsanhörungen-Schema wurde auf Stand 0017 repariert.');
      }

      if (repairPersonImportRunItemMatchStrategySchema(this.db)) {
        diagnostics.push('Personenimport-Protokollschema akzeptiert eindeutige Namensmatches.');
      }
  
      if (!this.tableExists('personal_data_audit_log') || !PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS.every((column) => this.columnExists('personal_data_audit_log', column))) {
        this.ensurePersonalDataAuditLogSchema();
        diagnostics.push('Audit-Log-Schema wurde auf Stand 0018 repariert.');
      }
  
      if (!this.tableExists('sbv_participations') || !SBV_PARTICIPATION_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_participations', column))) {
        this.ensureSbvParticipationSchema();
        diagnostics.push('SBV-Beteiligungsmonitor-Schema wurde auf Stand 0019 repariert.');
      }
  
      if (!this.tableExists('case_measures') || !CASE_MEASURES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measures', column)) || !this.tableExists('case_measure_participation') || !CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measure_participation', column))) {
        this.ensureCaseMeasureSchema();
        diagnostics.push('Fallmaßnahmen-Schema wurde auf Stand 0020 repariert.');
      }
  
      if (!this.tableExists('case_measure_notes') || !CASE_MEASURE_NOTES_REQUIRED_COLUMNS.every((column) => this.columnExists('case_measure_notes', column))) {
        this.ensureCaseMeasureNoteSchema();
        diagnostics.push('Maßnahmennotizen-Schema wurde auf Stand 0026 repariert.');
      }
  
      if (this.tableExists('case_documents')) {
        const missingDocumentExtractionColumns = CASE_DOCUMENTS_REQUIRED_COLUMNS
          .filter((column) => !this.columnExists('case_documents', column));
        if (missingDocumentExtractionColumns.length) {
          this.addColumnIfMissing('case_documents', 'extraction_quality', "TEXT NOT NULL DEFAULT 'unknown'");
          this.addColumnIfMissing('case_documents', 'text_extraction_status', "TEXT NOT NULL DEFAULT 'unknown'");
          this.addColumnIfMissing('case_documents', 'text_extracted_at', 'TEXT');
          this.addColumnIfMissing('case_documents', 'text_extractor_id', 'TEXT');
          this.addColumnIfMissing('case_documents', 'text_extraction_error', 'TEXT');
          this.addColumnIfMissing('case_documents', 'ocr_status', "TEXT NOT NULL DEFAULT 'not_required'");
          this.addColumnIfMissing('case_documents', 'ocr_text', 'TEXT');
          this.addColumnIfMissing('case_documents', 'ocr_engine', 'TEXT');
          this.addColumnIfMissing('case_documents', 'ocr_started_at', 'TEXT');
          this.addColumnIfMissing('case_documents', 'ocr_completed_at', 'TEXT');
          this.addColumnIfMissing('case_documents', 'ocr_error', 'TEXT');
          this.db.exec(`
            UPDATE case_documents
            SET extraction_quality = CASE WHEN COALESCE(extracted_text, '') <> '' THEN 'native_text' ELSE 'unknown' END,
                text_extraction_status = CASE WHEN COALESCE(extracted_text, '') <> '' THEN 'extracted' ELSE 'empty' END,
                text_extracted_at = COALESCE(imported_at, created_at, CURRENT_TIMESTAMP),
                text_extractor_id = COALESCE(text_extractor_id, CASE WHEN COALESCE(extracted_text, '') <> '' THEN 'legacy' ELSE 'unsupported' END)
            WHERE extraction_quality = 'unknown' AND text_extraction_status = 'unknown';
          `);
          this.ensureDocumentOcrSchema();
          diagnostics.push('Dokument-Extraktionsmetadaten wurden auf Stand 0031 repariert.');
        }
      }
  
      if (!this.tableExists('gremia_br_settings') || !GREMIA_BR_SETTINGS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_settings', column))) {
        this.ensureGremiaBrSettingsSchema();
        diagnostics.push('Gremia.BR-Einstellungsschema wurde auf Stand 0034 repariert.');
      }
  
      if (!this.tableExists('gremia_br_cache_entries') || !GREMIA_BR_CACHE_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_cache_entries', column))) {
        this.ensureGremiaBrCacheSchema();
        diagnostics.push('Gremia.BR-Lesecache-Schema wurde auf Stand 0033 repariert.');
      }

      if (!this.tableExists('gremia_br_workspace_actions') || !GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS.every((column) => this.columnExists('gremia_br_workspace_actions', column))) {
        this.ensureGremiaBrWorkspaceActionsSchema();
        diagnostics.push('Gremia.BR-Arbeitsbereichsaktionen-Schema wurde auf Stand 0054 repariert.');
      }

      if (!this.tableExists('case_handover_exports') || !this.tableExists('case_handover_export_items')
        || !CASE_HANDOVER_EXPORTS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_exports', column))
        || !CASE_HANDOVER_EXPORT_ITEMS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_handover_export_items', column))) {
        ensureCaseHandoverExportLedgerSchema(this.db);
        diagnostics.push('Fallübergabe-Exportmapping wurde auf Stand 0055 repariert.');
      }
  
      if (this.tableExists('case_documents') && (!this.tableExists('case_document_ocr_jobs') || !CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS.every((column) => this.columnExists('case_document_ocr_jobs', column)))) {
        this.ensureDocumentOcrSchema();
        diagnostics.push('Dokument-OCR-Schema wurde auf Stand 0031 repariert.');
      }
  
      if (!this.tableExists('case_search_index') || !this.tableExists('case_search_index_fts') || !this.tableExists('case_search_index_state') || !CASE_SEARCH_INDEX_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index', column)) || !CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS.every((column) => this.columnExists('case_search_index_state', column))) {
        this.ensureCaseSearchIndexSchema();
        diagnostics.push('Suchindex-Schema wurde auf Stand 0029 repariert.');
      }
  
      if (!this.hasCompleteProtectedPerson091Schema()) {
        this.ensureProtectedPerson091Schema();
        diagnostics.push('Personenverzeichnis-/Fallaktenbindung-Schema wurde auf Stand 0025 repariert.');
      }
  
      if (!this.hasCompleteCaseHandoverSchema()) {
        this.ensureCaseHandoverSchema();
        diagnostics.push('Fallübergabe-Schema wurde auf Stand 0036 repariert.');
      }
  
  
      if (!this.tableExists('sbv_control_protocols') || !SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS.every((column) => this.columnExists('sbv_control_protocols', column))) {
        this.ensureSbvControlProtocolSchema();
        diagnostics.push('SBV-Steuerungsprotokoll-Schema wurde auf Stand 0040 repariert.');
      }
  
      if (!this.hasCompleteActivityJournalSchema()) {
        this.ensureActivityJournalSchema();
        diagnostics.push('Tätigkeitsjournal-Schema wurde auf Stand 0041 repariert.');
      }
  
  
      if (!this.hasCompleteRecruitingParticipationSchema()) {
        this.ensureRecruitingParticipationSchema();
        diagnostics.push('Stellenbesetzungs-Schema wurde auf Stand 0045 repariert.');
      }
    }

  protected validateRequiredSchema(diagnostics: string[]): void {
      const requiredTables = [
        'cases',
        'case_notes',
        'case_documents',
        'contacts',
        'deadlines',
        'document_templates',
        'prevention_processes',
        'bem_processes',
        'bem_process_contacts',
        'bem_process_events',
        'termination_hearings',
        'personal_data_audit_log',
        'sbv_participations',
        'case_measures',
        'case_measure_participation',
        'case_measure_workplace_accommodation',
        'protected_persons',
        'person_import_runs',
        'person_import_run_items',
        'person_case_links',
        'case_external_references',
        'case_handover_imports',
        'case_handover_import_items',
        'case_handover_exports',
        'case_handover_export_items',
        'sbv_resource_records',
        'sbv_control_protocols',
        'activity_journal_entries',
        'activity_journal_links',
        'activity_journal_category_preferences',
        'generated_documents',
        'gremia_br_workspace_actions',
        'sbv_participation_violations',
        'sbv_participation_violation_events',
        'sbv_participation_violation_documents',
        'recruiting_participations',
        'recruiting_interview_events',
        ...Object.keys(SBV_OFFICE_0051_REQUIRED_TABLES)
      ];
  
      requiredTables.forEach((table) => {
        if (!this.tableExists(table)) {
          throw new Error(`Datenbankschema unvollständig: Tabelle ${table} fehlt.`);
        }
      });
  
      const requiredColumns: Record<string, string[]> = {
        cases: [...CASES_REQUIRED_COLUMNS],
        case_documents: [...CASE_DOCUMENTS_REQUIRED_COLUMNS],
        contacts: ['id', 'first_name', 'last_name', 'category'],
        deadlines: ['id', 'title', 'due_at', 'status', ...DEADLINE_RULE_SNAPSHOT_REQUIRED_COLUMNS],
        prevention_processes: ['id', 'case_id', 'status'],
        bem_processes: ['id', 'case_id', 'status', 'title', 'trigger_type', 'employee_response', 'privacy_notice_at', 'consent_scope', 'measure_owners', 'completion_reason', 'created_at', 'updated_at'],
        termination_hearings: [...TERMINATION_HEARINGS_REQUIRED_COLUMNS],
        personal_data_audit_log: [...PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS],
        sbv_participations: [...SBV_PARTICIPATION_REQUIRED_COLUMNS],
        case_measures: [...CASE_MEASURES_REQUIRED_COLUMNS],
        case_measure_participation: [...CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS],
        case_measure_workplace_accommodation: [...CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS],
        protected_persons: [...PROTECTED_PERSONS_REQUIRED_COLUMNS],
        person_import_run_items: [...PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS],
        case_external_references: [...CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS],
        case_handover_imports: [...CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS],
        case_handover_import_items: [...CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS],
        case_handover_exports: [...CASE_HANDOVER_EXPORTS_REQUIRED_COLUMNS],
        case_handover_export_items: [...CASE_HANDOVER_EXPORT_ITEMS_REQUIRED_COLUMNS],
        sbv_resource_records: [...SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS],
        sbv_control_protocols: [...SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS],
        activity_journal_entries: [...ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS],
        activity_journal_links: [...ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS],
        activity_journal_category_preferences: [...ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS],
        generated_documents: [...GENERATED_DOCUMENTS_REQUIRED_COLUMNS],
        gremia_br_workspace_actions: [...GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS],
        sbv_participation_violations: [...SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS],
        sbv_participation_violation_events: [...SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS],
        sbv_participation_violation_documents: [...SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS],
        recruiting_participations: [...RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS],
        recruiting_interview_events: [...RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS],
        ...Object.fromEntries(Object.entries(SBV_OFFICE_0051_REQUIRED_TABLES).map(([table, columns]) => [table, [...columns]]))
      };
  
      Object.entries(requiredColumns).forEach(([table, columns]) => {
        columns.forEach((column) => {
          if (!this.columnExists(table, column)) {
            throw new Error(`Datenbankschema unvollständig: Spalte ${table}.${column} fehlt.`);
          }
        });
      });
  
      if (this.tableExists('bem_processes_legacy_0500')) {
        diagnostics.push('Frühe/defekte BEM-Tabelle wurde als bem_processes_legacy_0500 gesichert.');
      }
    }
}
