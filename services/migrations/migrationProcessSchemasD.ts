import { GREMIA_BR_WORKSPACE_ACTIONS_REQUIRED_COLUMNS } from '../appSchema.js';
import { DEFAULT_LEGAL_BASIS } from '../sbvParticipationViolationSupport.js';
import { MigrationProcessSchemasC } from './migrationProcessSchemasC.js';

export class MigrationProcessSchemasD extends MigrationProcessSchemasC {
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

  protected ensureSbvParticipationViolationDocumentSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participation_violation_documents (
        id TEXT PRIMARY KEY,
        violation_id TEXT NOT NULL REFERENCES sbv_participation_violations(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE RESTRICT,
        stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
        template_key TEXT NOT NULL,
        template_version TEXT NOT NULL,
        immutable_snapshot INTEGER NOT NULL DEFAULT 1 CHECK (immutable_snapshot IN (0,1)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violation_documents_violation ON sbv_participation_violation_documents(violation_id);
    `);
    this.addColumnIfMissing('generated_documents', 'filename', 'TEXT');
    this.addColumnIfMissing('generated_documents', 'mime_type', 'TEXT');
    this.addColumnIfMissing('generated_documents', 'sha256', 'TEXT');
    this.addColumnIfMissing('generated_documents', 'document_key', 'TEXT');
    this.addColumnIfMissing('generated_documents', 'iv', 'TEXT');
    this.addColumnIfMissing('generated_documents', 'auth_tag', 'TEXT');
    this.addColumnIfMissing('generated_documents', 'size_bytes', 'INTEGER');
    this.addColumnIfMissing('generated_documents', 'violation_id', 'TEXT REFERENCES sbv_participation_violations(id) ON DELETE SET NULL');
    this.addColumnIfMissing('generated_documents', 'document_kind', "TEXT CHECK (document_kind IN ('generic','sbv_participation_violation')) DEFAULT 'generic'");
    this.addColumnIfMissing('generated_documents', 'template_version', 'TEXT');
  }

  protected ensureSbvParticipationViolationSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participation_violations (
        id TEXT PRIMARY KEY,
        stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
        status TEXT NOT NULL CHECK (status IN ('draft','open','sent','remedied','escalated','closed','withdrawn')),
        violation_type TEXT NOT NULL CHECK (violation_type IN ('not_informed','late_informed','incomplete_information','not_heard','late_heard','implementation_without_participation','repeated_violation','other')),
        source_context_type TEXT NOT NULL CHECK (source_context_type IN ('general_employer_practice','case','case_measure_participation','sbv_participation','termination_hearing','sbv_control_protocol','deadline','activity_journal','recruiting_participation')),
        source_context_id TEXT NOT NULL,
        case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
        related_participation_id TEXT REFERENCES sbv_participations(id) ON DELETE SET NULL,
        related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL,
        related_termination_hearing_id TEXT REFERENCES termination_hearings(id) ON DELETE SET NULL,
        related_deadline_id TEXT REFERENCES deadlines(id) ON DELETE SET NULL,
        related_activity_journal_entry_id TEXT REFERENCES activity_journal_entries(id) ON DELETE SET NULL,
        related_sbv_control_protocol_id TEXT REFERENCES sbv_control_protocols(id) ON DELETE SET NULL,
        related_recruiting_participation_id TEXT REFERENCES recruiting_participations(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        measure_description TEXT NOT NULL,
        wrong_behavior TEXT NOT NULL,
        required_behavior TEXT NOT NULL,
        consequence_warning TEXT,
        legal_basis TEXT NOT NULL DEFAULT '${DEFAULT_LEGAL_BASIS}',
        follow_up_due_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sent_at TEXT,
        closed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_status ON sbv_participation_violations(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_stage ON sbv_participation_violations(stage);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_source ON sbv_participation_violations(source_context_type, source_context_id);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_case ON sbv_participation_violations(case_id);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_recruiting ON sbv_participation_violations(related_recruiting_participation_id);
      CREATE TABLE IF NOT EXISTS sbv_participation_violation_events (
        id TEXT PRIMARY KEY,
        violation_id TEXT NOT NULL REFERENCES sbv_participation_violations(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','status_changed','document_generated','marked_sent','deadline_created','deadline_closed','remedied','escalated','closed','withdrawn')),
        from_status TEXT,
        to_status TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violation_events_violation ON sbv_participation_violation_events(violation_id, created_at);
    `);
    this.addColumnIfMissing('sbv_participation_violations', 'related_case_measure_id', 'TEXT REFERENCES case_measures(id) ON DELETE SET NULL');
    this.addColumnIfMissing('sbv_participation_violations', 'related_recruiting_participation_id', 'TEXT REFERENCES recruiting_participations(id) ON DELETE SET NULL');
  }
}
