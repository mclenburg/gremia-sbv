-- ============================================================
-- Gremia.SBV 0.3.17: Fallregister und verschlüsselte Dokumentablage
-- ============================================================

PRAGMA foreign_keys = ON;

-- Hinweis: Zusätzliche Spalten an case_documents werden defensiv im CaseService angelegt,
-- weil SQLite ADD COLUMN IF NOT EXISTS nicht überall unterstützt.
-- Betroffene Spalten: document_key, iv, auth_tag, size_bytes, imported_at.

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_display_name ON cases(display_name);
