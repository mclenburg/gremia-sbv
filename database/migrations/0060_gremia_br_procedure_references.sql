CREATE TABLE case_external_references_0060 (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'gremia_br' CHECK (source_system IN ('gremia_br')),
  source_type TEXT NOT NULL CHECK (source_type IN ('beschluss','sitzung','agenda','protokoll','verfahren')),
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

INSERT INTO case_external_references_0060 (
  id, case_id, source_system, source_type, source_id, title, description,
  source_url, fetched_at, snapshot_json, created_at, updated_at
)
SELECT id, case_id, source_system, source_type, source_id, title, description,
  source_url, fetched_at, snapshot_json, created_at, updated_at
FROM case_external_references;

DROP TABLE case_external_references;
ALTER TABLE case_external_references_0060 RENAME TO case_external_references;

CREATE INDEX idx_case_external_references_case ON case_external_references(case_id, updated_at DESC);
CREATE INDEX idx_case_external_references_source ON case_external_references(source_system, source_type, source_id);
