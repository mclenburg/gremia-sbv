-- 0027: Zentraler Fallakten-Suchindex für strukturierte Moduldaten und Dokumentvolltexte.
-- Die Tabelle liegt im SQLCipher-Vault und enthält kopierte Suchtexte; sie ist daher
-- bewusst an Falllöschung und Fallanonymisierung gekoppelt.

CREATE TABLE IF NOT EXISTS case_search_index (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_number TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_label TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT,
  occurred_at TEXT,
  updated_at TEXT NOT NULL,
  confidentiality TEXT NOT NULL DEFAULT 'sensibel',
  contains_health_data INTEGER NOT NULL DEFAULT 1,
  extraction_quality TEXT NOT NULL DEFAULT 'structured',
  navigation_kind TEXT NOT NULL,
  navigation_id TEXT NOT NULL,
  navigation_sub_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_search_index_case ON case_search_index(case_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_case_search_index_source ON case_search_index(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_case_search_index_navigation ON case_search_index(navigation_kind, navigation_id);

CREATE VIRTUAL TABLE IF NOT EXISTS case_search_index_fts USING fts5(
  index_id UNINDEXED,
  title,
  content,
  keywords,
  source_label,
  tokenize = 'unicode61 remove_diacritics 2'
);
