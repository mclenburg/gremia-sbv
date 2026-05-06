-- 0.8.12: Persistente, datensparsame interne Bezüge aus Fallnotizen.
CREATE TABLE IF NOT EXISTS case_note_links (
  id TEXT PRIMARY KEY,
  case_note_id TEXT NOT NULL REFERENCES case_notes(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('bem', 'participation', 'deadline')),
  target_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  accessible_label TEXT NOT NULL,
  text_start INTEGER NOT NULL DEFAULT 0,
  text_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_note_links_note ON case_note_links(case_note_id);
CREATE INDEX IF NOT EXISTS idx_case_note_links_target ON case_note_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_case_note_links_case ON case_note_links(case_id);
