CREATE TABLE IF NOT EXISTS contact_text_references (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  matched_text TEXT NOT NULL,
  replacement_text TEXT NOT NULL DEFAULT '[Kontakt anonymisiert]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  anonymized_at TEXT,
  UNIQUE(contact_id, source_type, source_id, field_name, matched_text),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_text_refs_contact ON contact_text_references(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_text_refs_source ON contact_text_references(source_type, source_id);
