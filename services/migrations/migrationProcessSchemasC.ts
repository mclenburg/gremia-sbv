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

  protected ensureRetentionActionsSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS retention_actions (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          reference TEXT,
          reason TEXT,
          affected_files INTEGER NOT NULL DEFAULT 0,
          affected_rows INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_retention_actions_created ON retention_actions(created_at DESC);
      `);
    }

  protected ensureReportExportSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS report_exports (
          id TEXT PRIMARY KEY,
          report_type TEXT NOT NULL,
          title TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          period_start TEXT,
          period_end TEXT,
          warning_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
      `);
    }

  protected ensureTemplateSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS document_templates (
          id TEXT PRIMARY KEY,
          template_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          legal_basis_json TEXT NOT NULL DEFAULT '[]',
          tags_json TEXT NOT NULL DEFAULT '[]',
          is_system INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS template_renders (
          id TEXT PRIMARY KEY,
          template_id TEXT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
          case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
        CREATE INDEX IF NOT EXISTS idx_template_renders_case ON template_renders(case_id, created_at);
      `);
    }

  protected ensureKnowledgeBaseSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS legal_norms (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          paragraph TEXT NOT NULL,
          title TEXT NOT NULL,
          short_text TEXT NOT NULL,
          full_text TEXT,
          sbv_meaning TEXT,
          practice_note TEXT,
          typical_cases TEXT,
          deadline_relevance TEXT,
          template_relevance TEXT,
          tags TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(source, paragraph)
        );

        CREATE INDEX IF NOT EXISTS idx_legal_norms_source ON legal_norms(source);
        CREATE INDEX IF NOT EXISTS idx_legal_norms_paragraph ON legal_norms(paragraph);
        CREATE INDEX IF NOT EXISTS idx_legal_norms_title ON legal_norms(title);

        CREATE TABLE IF NOT EXISTS case_legal_references (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          legal_norm_id TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL,
          UNIQUE(case_id, legal_norm_id),
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
          FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_case_legal_references_case_id ON case_legal_references(case_id);
        CREATE INDEX IF NOT EXISTS idx_case_legal_references_norm_id ON case_legal_references(legal_norm_id);

        CREATE TABLE IF NOT EXISTS norm_comments (
          id TEXT PRIMARY KEY,
          legal_norm_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS norm_case_law (
          id TEXT PRIMARY KEY,
          legal_norm_id TEXT NOT NULL,
          court TEXT NOT NULL,
          decision_date TEXT,
          file_number TEXT NOT NULL,
          short_holding TEXT NOT NULL,
          relevance TEXT,
          source_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS norm_checklist_items (
          id TEXT PRIMARY KEY,
          legal_norm_id TEXT NOT NULL,
          text TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
        );
      `);
    }

  protected ensurePrivacyReviewSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS privacy_review_items (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
          reason TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'normal',
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
      this.addColumnIfMissing('privacy_review_items', 'protected_person_id', 'TEXT REFERENCES protected_persons(id) ON DELETE SET NULL');
      this.addColumnIfMissing('privacy_review_items', 'priority', "TEXT NOT NULL DEFAULT 'normal'");
      this.addColumnIfMissing('privacy_review_items', 'due_at', 'TEXT');
      this.addColumnIfMissing('privacy_review_items', 'free_text_review_required', 'INTEGER NOT NULL DEFAULT 1');
      this.addColumnIfMissing('privacy_review_items', 'context_json', "TEXT NOT NULL DEFAULT '{}'");
      this.addColumnIfMissing('privacy_review_items', 'status', "TEXT NOT NULL DEFAULT 'open'");
    }

  protected ensureSbvResourceSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sbv_resource_records (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          legal_basis TEXT NOT NULL,
          started_at TEXT,
          ended_at TEXT,
          provider TEXT,
          participants TEXT,
          task_context TEXT,
          necessity_reason TEXT,
          employer_reaction TEXT,
          cost_note TEXT,
          status TEXT NOT NULL DEFAULT 'documented',
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_kind ON sbv_resource_records(kind);
        CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_status ON sbv_resource_records(status);
        CREATE INDEX IF NOT EXISTS idx_sbv_resource_records_started ON sbv_resource_records(started_at);
      `);
    }

  protected ensureComplianceIncidentSchema(): void {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS compliance_incidents (
          id TEXT PRIMARY KEY,
          occurred_at TEXT NOT NULL,
          discovered_at TEXT NOT NULL,
          category TEXT NOT NULL,
          risk_level TEXT NOT NULL,
          status TEXT NOT NULL,
          summary TEXT NOT NULL,
          affected_data_categories TEXT NOT NULL DEFAULT '',
          immediate_measures TEXT NOT NULL DEFAULT '',
          dsb_notified_at TEXT,
          authority_notification_checked INTEGER NOT NULL DEFAULT 0,
          data_subjects_informed_at TEXT,
          closed_at TEXT,
          lessons_learned TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_incidents_status ON compliance_incidents(status, discovered_at);
        CREATE INDEX IF NOT EXISTS idx_compliance_incidents_risk ON compliance_incidents(risk_level, discovered_at);
      `);
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
