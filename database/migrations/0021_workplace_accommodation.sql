-- 0021: Arbeitsplatzgestaltung als fallaktenzentrierte Maßnahme nach § 164 Abs. 4 SGB IX.

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
  FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_status ON case_measure_workplace_accommodation(accommodation_status);
CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_category ON case_measure_workplace_accommodation(category);
CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_review ON case_measure_workplace_accommodation(effectiveness_review_at);
