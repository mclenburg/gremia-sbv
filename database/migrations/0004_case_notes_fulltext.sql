-- ============================================================
-- Gremia.SBV 0.3.16: Gesprächsnotizen / Protokolle und Volltextsuche
-- ============================================================

PRAGMA foreign_keys = ON;

-- Hinweis:
-- Spaltenerweiterungen (case_notes.title, case_documents.display_title,
-- case_documents.extracted_text) werden defensiv im CaseService angelegt,
-- weil SQLite kein ADD COLUMN IF NOT EXISTS in allen Zielumgebungen bietet.
-- Diese Migration legt die FTS-Indizes und die Index-Nachbefüllung an.

CREATE VIRTUAL TABLE IF NOT EXISTS case_notes_fts USING fts5(
  id UNINDEXED,
  case_id UNINDEXED,
  case_number UNINDEXED,
  title,
  participants,
  content,
  next_steps,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE VIRTUAL TABLE IF NOT EXISTS case_documents_fts USING fts5(
  id UNINDEXED,
  case_id UNINDEXED,
  case_number UNINDEXED,
  title,
  filename,
  extracted_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE INDEX IF NOT EXISTS idx_case_notes_date ON case_notes(case_id, note_date DESC);

INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps)
SELECT n.id, n.case_id, c.case_number, COALESCE(n.title, 'Gesprächsnotiz'), COALESCE(n.participants, ''), n.content, COALESCE(n.next_steps, '')
FROM case_notes n
JOIN cases c ON c.id = n.case_id
WHERE NOT EXISTS (SELECT 1 FROM case_notes_fts f WHERE f.id = n.id);

INSERT INTO case_documents_fts (id, case_id, case_number, title, filename, extracted_text)
SELECT d.id, d.case_id, c.case_number, COALESCE(d.display_title, d.filename), d.filename, COALESCE(d.extracted_text, '')
FROM case_documents d
JOIN cases c ON c.id = d.case_id
WHERE NOT EXISTS (SELECT 1 FROM case_documents_fts f WHERE f.id = d.id);
