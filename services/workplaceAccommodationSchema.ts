import type { DatabaseAdapter } from './databaseService.js';
import type { CaseMeasureService } from './caseMeasureService.js';
export function ensureWorkplaceAccommodationSchema(db: DatabaseAdapter, caseMeasures: CaseMeasureService): void {
  caseMeasures.ensureSchema();
  db.exec(`
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
        funding_carrier TEXT,
        funding_applied_at TEXT,
        funding_documents_status TEXT,
        funding_questions TEXT,
        funding_decision TEXT,
        funding_amount REAL,
        ordered_at TEXT,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_status ON case_measure_workplace_accommodation(accommodation_status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_category ON case_measure_workplace_accommodation(category);
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_review ON case_measure_workplace_accommodation(effectiveness_review_at);
    `);
  const columns = new Set(
      db.prepare<{ name: string }>("PRAGMA table_info(case_measure_workplace_accommodation)").all().map((row) => row.name),
    );
  const additions: Array<[string, string]> = [
      ["funding_carrier", "TEXT"],
      ["funding_applied_at", "TEXT"],
      ["funding_documents_status", "TEXT"],
      ["funding_questions", "TEXT"],
      ["funding_decision", "TEXT"],
      ["funding_amount", "REAL"],
      ["ordered_at", "TEXT"],
    ];
  for (const [name, type] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE case_measure_workplace_accommodation ADD COLUMN ${name} ${type}`);
    }
  }
}
