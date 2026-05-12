-- 0026: Mehrere vertrauliche Notizen direkt an Maßnahmen/Prozessknoten.
-- Dient der Protokollierung von Terminen, Nachfassern und Verlauf direkt am Maßnahmenkontext.

CREATE TABLE IF NOT EXISTS case_measure_notes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  measure_type TEXT NOT NULL CHECK (measure_type IN ('prevention','bem','termination_hearing','equalization','participation','workplace_accommodation')),
  measure_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note_at TEXT NOT NULL,
  participants TEXT,
  content TEXT NOT NULL,
  next_steps TEXT,
  contains_health_data INTEGER NOT NULL DEFAULT 1,
  confidential_level TEXT NOT NULL DEFAULT 'sensibel' CHECK (confidential_level IN ('normal','sensibel','hoch_sensibel')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_measure_notes_measure ON case_measure_notes(measure_type, measure_id, note_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_measure_notes_case ON case_measure_notes(case_id, note_at DESC);
