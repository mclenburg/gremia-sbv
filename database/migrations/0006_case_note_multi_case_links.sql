-- Gremia.SBV Migration 0006
-- Gesprächsnotizen können mehreren Fallakten zugeordnet werden.

CREATE TABLE IF NOT EXISTS case_note_cases (
  note_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (note_id, case_id),
  FOREIGN KEY (note_id) REFERENCES case_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_note_cases_case_id ON case_note_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_case_note_cases_note_id ON case_note_cases(note_id);

INSERT OR IGNORE INTO case_note_cases (note_id, case_id, is_primary, created_at)
SELECT id, case_id, 1, COALESCE(created_at, datetime('now'))
FROM case_notes;
