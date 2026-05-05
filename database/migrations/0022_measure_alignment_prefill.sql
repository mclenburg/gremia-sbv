-- Gremia.SBV 0.8.6-b
-- Einheitliche Maßnahmenarchitektur: Nachbearbeitung und schnelle Übersichten.

CREATE INDEX IF NOT EXISTS idx_case_measures_follow_up ON case_measures(case_id, requires_follow_up, status);
CREATE INDEX IF NOT EXISTS idx_case_measure_events_measure_created ON case_measure_events(measure_id, created_at);
