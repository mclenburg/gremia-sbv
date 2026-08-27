import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { MigrationRepairValidation } from './migrations/migrationRepairValidation.js';
import { addColumnsIfMissing } from './migrations/schemaColumnMigration.js';
import { DEFAULT_LEGAL_BASIS } from './sbvParticipationViolationSupport.js';

class RuntimeSchemaCompatibility extends MigrationRepairValidation {
  constructor(database: DatabaseAdapter) {
    super(database, path.join(process.cwd(), 'database/schema.sql'), path.join(process.cwd(), 'database/migrations'));
  }

  contacts(): void { this.ensureContactsSchema(); }
  personalDataAudit(): void { this.ensurePersonalDataAuditLogSchema(); }
  activityJournal(): void { this.ensureActivityJournalSchema(); }
  caseMeasures(): void { this.ensureCaseMeasureSchema(); }
  caseMeasureNotes(): void { this.ensureCaseMeasureNoteSchema(); }
  caseHandover(): void { this.ensureCaseHandoverSchema(); }
  documentOcr(): void { this.ensureDocumentOcrSchema(); }
  protectedPersonBinding(): void { this.ensureProtectedPerson091Schema(); }
  recruitingParticipation(): void { this.ensureRecruitingParticipationSchema(); }
  sbvControlProtocol(): void { this.ensureSbvControlProtocolSchema(); }
  workplaceAccommodation(): void { this.ensureWorkplaceAccommodationSchema(); }
}

function compatibility(db: DatabaseAdapter): RuntimeSchemaCompatibility {
  return new RuntimeSchemaCompatibility(db);
}

export function ensureContactsRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).contacts(); }
export function ensurePersonalDataAuditRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).personalDataAudit(); }
export function ensureActivityJournalRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).activityJournal(); }
export function ensureActivityJournalPreferenceRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).activityJournal(); }
export function ensureCaseMeasureRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).caseMeasures(); }
export function ensureCaseHandoverRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).caseHandover(); }
export function ensureDocumentOcrRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).documentOcr(); }
export function ensurePersonCaseBindingRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).protectedPersonBinding(); }
export function ensureRecruitingParticipationRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).recruitingParticipation(); }
export function ensureSbvControlProtocolRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).sbvControlProtocol(); }
export function ensureWorkplaceAccommodationRuntimeSchema(db: DatabaseAdapter): void { compatibility(db).workplaceAccommodation(); }

export function ensureRetentionRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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

export function ensureReportRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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

export function ensureTemplateRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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

export function ensureKnowledgeRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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

export function ensurePrivacyReviewRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`CREATE TABLE IF NOT EXISTS privacy_review_items (
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
      );`);
  addColumnsIfMissing(db, 'privacy_review_items', [
    ['protected_person_id', 'TEXT REFERENCES protected_persons(id) ON DELETE SET NULL'],
    ['priority', "TEXT NOT NULL DEFAULT 'normal'"],
    ['due_at', 'TEXT'],
    ['free_text_review_required', 'INTEGER NOT NULL DEFAULT 1'],
    ['context_json', "TEXT NOT NULL DEFAULT '{}'"],
    ['status', "TEXT NOT NULL DEFAULT 'open'"],
  ]);
  db.exec(`
      CREATE INDEX IF NOT EXISTS idx_privacy_review_items_case ON privacy_review_items(case_id, status);
      CREATE INDEX IF NOT EXISTS idx_privacy_review_items_person ON privacy_review_items(protected_person_id, status);
    `);
}

export function ensureSbvResourceRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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

export function ensureSbvParticipationViolationDocumentRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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
  addColumnsIfMissing(db, 'generated_documents', [
    ['filename', 'TEXT'],
    ['mime_type', 'TEXT'],
    ['sha256', 'TEXT'],
    ['document_key', 'TEXT'],
    ['iv', 'TEXT'],
    ['auth_tag', 'TEXT'],
    ['size_bytes', 'INTEGER'],
    ['violation_id', 'TEXT REFERENCES sbv_participation_violations(id) ON DELETE SET NULL'],
    ['document_kind', "TEXT CHECK (document_kind IN ('generic','sbv_participation_violation')) DEFAULT 'generic'"],
    ['template_version', 'TEXT'],
  ]);
}

export function ensureSbvParticipationViolationRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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
  addColumnsIfMissing(db, 'sbv_participation_violations', [
    ['related_case_measure_id', 'TEXT REFERENCES case_measures(id) ON DELETE SET NULL'],
    ['related_recruiting_participation_id', 'TEXT REFERENCES recruiting_participations(id) ON DELETE SET NULL'],
  ]);
}

export function ensureComplianceIncidentRuntimeSchema(db: DatabaseAdapter): void {
  db.exec(`
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
