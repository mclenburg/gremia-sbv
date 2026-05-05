-- 0.8.6-c: Fristen und Dokumente können optional direkt einer Fallmaßnahme zugeordnet werden.
-- Die Fallakte bleibt führend; measure_id dient nur der präzisen fachlichen Zuordnung.

ALTER TABLE deadlines ADD COLUMN measure_id TEXT;
ALTER TABLE case_documents ADD COLUMN measure_id TEXT;

CREATE INDEX IF NOT EXISTS idx_deadlines_measure_id ON deadlines(measure_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_measure ON deadlines(case_id, measure_id, due_at);
CREATE INDEX IF NOT EXISTS idx_case_documents_measure_id ON case_documents(measure_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_measure ON case_documents(case_id, measure_id, created_at);
