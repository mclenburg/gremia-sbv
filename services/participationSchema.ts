import type { DatabaseAdapter } from './databaseService.js';
import type { CaseMeasureService } from './caseMeasureService.js';
import { type ParticipationRow, type SqliteTableRow, type IdRow, type ParticipationDetailIdRow, participationStatusToMeasureStatus } from './participationSupport.js';
function migrateLegacyParticipations(db: DatabaseAdapter): void {
const hasLegacy = db
      .prepare<SqliteTableRow>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sbv_participations'",
      )
      .get();
    if (!hasLegacy) return;
    const rows = db.prepare<ParticipationRow>("SELECT * FROM sbv_participations").all();
    for (const row of rows) {
      const existing = db
        .prepare<IdRow>(
          "SELECT id FROM case_measures WHERE (id = ? OR source_id = ?) AND type = 'sbv_participation'",
        )
        .get(row.id, row.id);
      if (!existing) {
        db
          .prepare(
            `
          INSERT INTO case_measures (
            id, case_id, type, title, status, risk_level, created_from, summary, next_step, due_at,
            opened_at, closed_at, requires_follow_up, source_id, created_at, updated_at
          ) VALUES (?, ?, 'sbv_participation', ?, ?, ?, 'migration', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            row.id,
            row.case_id,
            row.title,
            participationStatusToMeasureStatus(row.status ?? "neu"),
            row.risk_level ?? "normal",
            row.violation_summary ?? null,
            row.next_step ?? null,
            row.statement_due_at ?? row.suspension_due_at ?? null,
            row.first_known_at ?? row.created_at,
            row.status === "abgeschlossen" ||
              row.status === "pflichtverstoss_dokumentiert"
              ? row.updated_at
              : null,
            ["neu", "abgeschlossen"].includes(row.status ?? "neu") ? 0 : 1,
            row.id,
            row.created_at,
            row.updated_at,
          );
      }
      const measureId = existing?.id ?? row.id;
      const detail = db
        .prepare<ParticipationDetailIdRow>(
          "SELECT measure_id FROM case_measure_participation WHERE measure_id = ?",
        )
        .get(measureId);
      if (!detail) {
        db
          .prepare(
            `
          INSERT INTO case_measure_participation (
            measure_id, employer_measure_type, person_status, decision_stage, participation_status,
            sbv_knowledge_at, employer_information_at, hearing_requested_at, sbv_statement_due_at,
            sbv_statement_submitted_at, employer_decision_at, implementation_at,
            information_complete, hearing_before_decision, decision_notified,
            suspension_requested_at, suspension_deadline_at, violation_summary, sbv_position, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            measureId,
            row.measure_type ?? "sonstiges",
            row.person_status ?? "unklar",
            row.decision_stage ?? "unklar",
            row.status ?? "neu",
            row.first_known_at ?? null,
            row.information_received_at ?? null,
            row.hearing_requested_at ?? null,
            row.statement_due_at ?? null,
            row.statement_submitted_at ?? null,
            row.employer_decision_at ?? null,
            row.implementation_at ?? null,
            row.information_complete ?? 0,
            row.hearing_before_decision ?? 0,
            row.decision_notified ?? 0,
            row.suspension_requested_at ?? null,
            row.suspension_due_at ?? null,
            row.violation_summary ?? null,
            row.sbv_position ?? null,
            row.created_at,
            row.updated_at,
          );
      }
    }
}

export function ensureParticipationSchema(db: DatabaseAdapter, caseMeasures: CaseMeasureService): void {
caseMeasures.ensureSchema();
    db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_status ON case_measure_participation(participation_status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_statement_due ON case_measure_participation(sbv_statement_due_at);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_suspension_due ON case_measure_participation(suspension_deadline_at);
    `);
    migrateLegacyParticipations(db);
    
}
