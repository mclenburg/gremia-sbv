import type { DatabaseAdapter } from './databaseService.js';
import { DEFAULT_LEGAL_BASIS } from './sbvParticipationViolationSupport.js';
function ensureRelatedRecruitingParticipationColumn(db: DatabaseAdapter): void {
try {
      const columns = db.prepare<{ name: string }>('PRAGMA table_info(sbv_participation_violations)').all().map((row) => row.name);
      if (!columns.includes('related_recruiting_participation_id')) {
        db.exec('ALTER TABLE sbv_participation_violations ADD COLUMN related_recruiting_participation_id TEXT REFERENCES recruiting_participations(id) ON DELETE SET NULL; CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_recruiting ON sbv_participation_violations(related_recruiting_participation_id);');
      }
    } catch (error) {
      console.warn('Gremia.SBV participation violation recruiting schema compatibility check failed', error instanceof Error ? error.name : 'UnknownError');
    }
}

function ensureRelatedCaseMeasureColumn(db: DatabaseAdapter): void {
try {
      const columns = db.prepare<{ name: string }>('PRAGMA table_info(sbv_participation_violations)').all().map((row) => row.name);
      if (!columns.includes('related_case_measure_id')) {
        db.exec('ALTER TABLE sbv_participation_violations ADD COLUMN related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL;');
      }
    } catch (error) {
      console.warn('Gremia.SBV participation violation schema compatibility check failed', error instanceof Error ? error.name : 'UnknownError');
    }
}

export function ensureSbvParticipationViolationSchema(db: DatabaseAdapter): void {
db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participation_violations (
        id TEXT PRIMARY KEY,
        stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
        status TEXT NOT NULL CHECK (status IN ('draft','open','sent','remedied','escalated','closed','withdrawn')),
        violation_type TEXT NOT NULL CHECK (violation_type IN ('not_informed','late_informed','incomplete_information','not_heard','late_heard','implementation_without_participation','repeated_violation','other')),
        source_context_type TEXT NOT NULL CHECK (source_context_type IN ('case','case_measure_participation','sbv_participation','termination_hearing','sbv_control_protocol','deadline','activity_journal','recruiting_participation')),
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
    ensureRelatedCaseMeasureColumn(db);
    ensureRelatedRecruitingParticipationColumn(db);
    
}
