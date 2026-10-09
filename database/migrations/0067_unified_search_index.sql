-- Einheitlicher Suchindex im verschlüsselten Tresor. Der alte Fallindex bleibt
-- während der schrittweisen Umstellung lesbar und wird erst nach Abnahme entfernt.
CREATE TABLE IF NOT EXISTS search_entries (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  case_number TEXT,
  module TEXT NOT NULL,
  source_label TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '',
  occurred_at TEXT,
  updated_at TEXT NOT NULL,
  extraction_quality TEXT NOT NULL DEFAULT 'structured',
  navigation_kind TEXT NOT NULL,
  navigation_id TEXT NOT NULL,
  navigation_sub_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_entries_case ON search_entries(case_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_search_entries_source ON search_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_search_entries_module ON search_entries(module, updated_at);
CREATE TABLE IF NOT EXISTS search_entry_cases (
  entry_id TEXT NOT NULL REFERENCES search_entries(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_search_entry_cases_case ON search_entry_cases(case_id, entry_id);

CREATE VIRTUAL TABLE IF NOT EXISTS search_entries_fts USING fts5(
  entry_id UNINDEXED,
  title,
  content,
  keywords,
  source_label,
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS search_entries_fts_delete
AFTER DELETE ON search_entries
BEGIN
  DELETE FROM search_entries_fts WHERE entry_id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS search_change_clock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO search_change_clock (id, revision) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS search_dirty_tables (
  table_name TEXT PRIMARY KEY,
  revision INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS search_index_build_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  built_revision INTEGER NOT NULL,
  built_at TEXT NOT NULL,
  entry_count INTEGER NOT NULL
);
