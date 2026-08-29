import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../databaseService.js';
import { classifyCaseLegalReferencesColumns } from '../knowledgeMigrationPolicy.js';
import { APP_VERSION } from '../generated/appMetadata.js';
import { getSchemaMigrationHook } from '../schemaMigrationHooks.js';
import { APP_SCHEMA_VERSION, ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS, ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS, COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS, GENERATED_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS, SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS, SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS, SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS, RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS, RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS, CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS, CASE_DOCUMENTS_REQUIRED_COLUMNS, CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS, CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS, CASES_REQUIRED_COLUMNS, CASE_MEASURES_REQUIRED_COLUMNS, CASE_MEASURE_PARTICIPATION_REQUIRED_COLUMNS, CASE_MEASURE_NOTES_REQUIRED_COLUMNS, CASE_MEASURE_WORKPLACE_ACCOMMODATION_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_REQUIRED_COLUMNS, CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS, GREMIA_BR_CACHE_REQUIRED_COLUMNS, GREMIA_BR_SETTINGS_REQUIRED_COLUMNS, GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS, PERSON_IMPORT_RUN_ITEMS_REQUIRED_COLUMNS, PROTECTED_PERSONS_REQUIRED_COLUMNS, DATABASE_SCHEMA_APP_VERSION_KEY, DATABASE_SCHEMA_VERSION_KEY, PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS, SBV_PARTICIPATION_REQUIRED_COLUMNS, TERMINATION_HEARINGS_REQUIRED_COLUMNS } from '../appSchema.js';
import { MigrationProcessSchemasB } from './migrationProcessSchemasB.js';

export class MigrationProcessSchemasC extends MigrationProcessSchemasB {
  protected rebuildTerminationHearingsTable(): void {
      this.db.exec(`
        DROP INDEX IF EXISTS idx_termination_hearings_case_id;
        DROP INDEX IF EXISTS idx_termination_hearings_status;
        DROP INDEX IF EXISTS idx_termination_hearings_due;
        DROP INDEX IF EXISTS idx_termination_hearings_received_at;
        DROP TABLE IF EXISTS termination_hearings;
  
        CREATE TABLE termination_hearings (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'eingang',
          termination_type TEXT NOT NULL DEFAULT 'sonstiges',
          protection_status TEXT NOT NULL DEFAULT 'unklar',
          received_at TEXT,
          employer_deadline_at TEXT,
          sbv_statement_due_at TEXT,
          works_council_hearing_at TEXT,
          integration_office_requested_at TEXT,
          integration_office_decision_at TEXT,
          integration_office_decision TEXT,
          employer_reason TEXT,
          missing_information TEXT,
          sbv_assessment TEXT,
          statement TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
  
        CREATE INDEX IF NOT EXISTS idx_termination_hearings_case_id ON termination_hearings(case_id);
        CREATE INDEX IF NOT EXISTS idx_termination_hearings_status ON termination_hearings(status);
        CREATE INDEX IF NOT EXISTS idx_termination_hearings_due ON termination_hearings(sbv_statement_due_at);
      `);
    }

  protected ensurePersonalDataAuditLogSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS personal_data_audit_log (
          id TEXT PRIMARY KEY,
          sequence INTEGER NOT NULL UNIQUE,
          occurred_at TEXT NOT NULL,
          actor TEXT NOT NULL,
          action TEXT NOT NULL,
          subject_type TEXT NOT NULL,
          subject_id TEXT,
          case_id TEXT,
          purpose TEXT NOT NULL,
          metadata_json TEXT NOT NULL,
          previous_hash TEXT NOT NULL,
          entry_hash TEXT NOT NULL
        );
  
        CREATE INDEX IF NOT EXISTS idx_personal_data_audit_sequence ON personal_data_audit_log(sequence);
        CREATE INDEX IF NOT EXISTS idx_personal_data_audit_case ON personal_data_audit_log(case_id, occurred_at);
        CREATE INDEX IF NOT EXISTS idx_personal_data_audit_subject ON personal_data_audit_log(subject_type, subject_id, occurred_at);
        CREATE INDEX IF NOT EXISTS idx_personal_data_audit_action ON personal_data_audit_log(action, occurred_at);
      `);
    }

  protected ensureSbvParticipationSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sbv_participations (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          title TEXT NOT NULL,
          measure_type TEXT NOT NULL DEFAULT 'sonstiges',
          status TEXT NOT NULL DEFAULT 'neu',
          risk_level TEXT NOT NULL DEFAULT 'normal',
          person_status TEXT NOT NULL DEFAULT 'unklar',
          decision_stage TEXT NOT NULL DEFAULT 'unklar',
          first_known_at TEXT,
          information_received_at TEXT,
          hearing_requested_at TEXT,
          statement_due_at TEXT,
          statement_submitted_at TEXT,
          employer_decision_at TEXT,
          implementation_at TEXT,
          information_complete INTEGER NOT NULL DEFAULT 0,
          hearing_before_decision INTEGER NOT NULL DEFAULT 0,
          decision_notified INTEGER NOT NULL DEFAULT 0,
          suspension_requested_at TEXT,
          suspension_due_at TEXT,
          violation_summary TEXT,
          sbv_position TEXT,
          next_step TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
  
        CREATE TABLE IF NOT EXISTS sbv_participation_events (
          id TEXT PRIMARY KEY,
          participation_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(participation_id) REFERENCES sbv_participations(id) ON DELETE CASCADE
        );
  
        CREATE INDEX IF NOT EXISTS idx_sbv_participations_case_id ON sbv_participations(case_id);
        CREATE INDEX IF NOT EXISTS idx_sbv_participations_status ON sbv_participations(status);
        CREATE INDEX IF NOT EXISTS idx_sbv_participations_risk ON sbv_participations(risk_level);
        CREATE INDEX IF NOT EXISTS idx_sbv_participations_statement_due ON sbv_participations(statement_due_at);
        CREATE INDEX IF NOT EXISTS idx_sbv_participations_suspension_due ON sbv_participations(suspension_due_at);
        CREATE INDEX IF NOT EXISTS idx_sbv_participation_events_process ON sbv_participation_events(participation_id, created_at);
      `);
    }

  protected ensureGremiaBrSettingsSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS gremia_br_settings (
          id TEXT PRIMARY KEY CHECK (id = 'default'),
          enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
          server_url TEXT NOT NULL DEFAULT '',
          username TEXT NOT NULL DEFAULT '',
          password_secret TEXT NOT NULL DEFAULT '',
          api_mode TEXT NOT NULL DEFAULT 'legacy_read_bridge' CHECK (api_mode IN ('legacy_read_bridge','gremia_br_v2')),
          selected_body_id TEXT,
          selected_body_name TEXT,
          selected_organization_id TEXT,
          selected_security_domain TEXT,
          last_connection_test_at TEXT,
          last_successful_login_at TEXT,
          profile_json TEXT,
          relevance_keywords_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      this.addColumnIfMissing('gremia_br_settings', 'relevance_keywords_json', 'TEXT');
      this.addColumnIfMissing('gremia_br_settings', 'api_mode', "TEXT NOT NULL DEFAULT 'legacy_read_bridge'");
      this.addColumnIfMissing('gremia_br_settings', 'selected_body_id', 'TEXT');
      this.addColumnIfMissing('gremia_br_settings', 'selected_body_name', 'TEXT');
      this.addColumnIfMissing('gremia_br_settings', 'selected_organization_id', 'TEXT');
      this.addColumnIfMissing('gremia_br_settings', 'selected_security_domain', 'TEXT');
    }

  protected ensureGremiaBrCacheSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS gremia_br_cache_entries (
          id TEXT PRIMARY KEY,
          cache_key TEXT NOT NULL UNIQUE,
          source_type TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          fetched_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_gremia_br_cache_entries_key ON gremia_br_cache_entries(cache_key);
        CREATE INDEX IF NOT EXISTS idx_gremia_br_cache_entries_fetched ON gremia_br_cache_entries(fetched_at DESC);
      `);
    }

  protected ensureGremiaBrWorkspaceActionsSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS gremia_br_workspace_actions (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL CHECK (action_type IN ('document_uploaded','document_shared','agenda_item_requested','information_requested')),
          local_document_id TEXT REFERENCES generated_documents(id) ON DELETE SET NULL,
          case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
          target_body_id TEXT,
          target_body_name TEXT,
          target_security_domain TEXT,
          remote_document_id TEXT,
          remote_share_id TEXT,
          remote_meeting_id TEXT,
          remote_agenda_version_id TEXT,
          purpose TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('uploaded','shared','requested','failed')),
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_gremia_br_workspace_actions_document ON gremia_br_workspace_actions(local_document_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_gremia_br_workspace_actions_case ON gremia_br_workspace_actions(case_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_gremia_br_workspace_actions_target ON gremia_br_workspace_actions(target_security_domain, created_at);
      `);
      const missingColumn = GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS
        .find((column) => !this.columnExists('gremia_br_workspace_actions', column));
      if (missingColumn) {
        throw new Error(`Gremia.BR-Arbeitsbereichsaktionen-Schema unvollständig: Spalte ${missingColumn} fehlt.`);
      }
    }

  protected ensureSbvControlProtocolSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sbv_control_protocols (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          partner TEXT NOT NULL,
          topic TEXT NOT NULL,
          meeting_at TEXT NOT NULL,
          participants TEXT,
          legal_context TEXT,
          discussion TEXT,
          result TEXT,
          next_steps TEXT,
          follow_up_due_at TEXT,
          status TEXT NOT NULL DEFAULT 'documented',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_partner ON sbv_control_protocols(partner);
        CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_topic ON sbv_control_protocols(topic);
        CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_status ON sbv_control_protocols(status);
        CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_meeting ON sbv_control_protocols(meeting_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sbv_control_protocols_follow_up ON sbv_control_protocols(follow_up_due_at);
      `);
    }
}
