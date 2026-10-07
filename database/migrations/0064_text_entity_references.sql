CREATE TABLE IF NOT EXISTS text_entity_references (
  id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('person', 'case')),
  entity_id TEXT NOT NULL,
  label TEXT NOT NULL,
  marker TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_text_entity_references_entity
  ON text_entity_references(entity_kind, entity_id);
