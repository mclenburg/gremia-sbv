-- 0035: Externe Gremia.BR-Referenzen für Fallakten.
-- Speichert bewusst nur Referenzmetadaten aus Gremia.BR und keine SBV-Falldaten in Richtung Gremia.BR.

CREATE TABLE IF NOT EXISTS case_external_references (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'gremia_br' CHECK (source_system IN ('gremia_br')),
  source_type TEXT NOT NULL CHECK (source_type IN ('beschluss','sitzung','agenda','protokoll')),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  fetched_at TEXT NOT NULL,
  snapshot_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE,
  UNIQUE(case_id, source_system, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_case_external_references_case ON case_external_references(case_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_external_references_source ON case_external_references(source_system, source_type, source_id);
