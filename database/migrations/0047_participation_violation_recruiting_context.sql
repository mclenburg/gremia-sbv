PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS sbv_participation_violations_rebuild_0047 (
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
  legal_basis TEXT NOT NULL DEFAULT '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
  follow_up_due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT,
  closed_at TEXT
);

INSERT OR IGNORE INTO sbv_participation_violations_rebuild_0047 (
  id, stage, status, violation_type, source_context_type, source_context_id, case_id,
  related_participation_id, related_case_measure_id, related_termination_hearing_id,
  related_deadline_id, related_activity_journal_entry_id, related_sbv_control_protocol_id,
  related_recruiting_participation_id, subject, measure_description, wrong_behavior,
  required_behavior, consequence_warning, legal_basis, follow_up_due_at, created_at,
  updated_at, sent_at, closed_at
)
SELECT
  id, stage, status, violation_type, source_context_type, source_context_id, case_id,
  related_participation_id, related_case_measure_id, related_termination_hearing_id,
  related_deadline_id, related_activity_journal_entry_id, related_sbv_control_protocol_id,
  NULL AS related_recruiting_participation_id, subject, measure_description, wrong_behavior,
  required_behavior, consequence_warning, legal_basis, follow_up_due_at, created_at,
  updated_at, sent_at, closed_at
FROM sbv_participation_violations;

DROP TABLE sbv_participation_violations;
ALTER TABLE sbv_participation_violations_rebuild_0047 RENAME TO sbv_participation_violations;

CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_status ON sbv_participation_violations(status);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_stage ON sbv_participation_violations(stage);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_source ON sbv_participation_violations(source_context_type, source_context_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_case ON sbv_participation_violations(case_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_recruiting ON sbv_participation_violations(related_recruiting_participation_id);

PRAGMA foreign_keys=on;
