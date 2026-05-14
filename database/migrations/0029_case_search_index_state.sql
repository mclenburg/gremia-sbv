-- 0029: Suchindex-Zustand für inkrementelle Aktualisierung.
-- Der Suchservice nutzt diese Tabelle, um Suchläufe nicht mehr pauschal neu
-- aufzubauen, sondern nur bei fehlendem oder veraltetem Index zu reindexieren.

CREATE TABLE IF NOT EXISTS case_search_index_state (
  case_id TEXT PRIMARY KEY,
  indexed_at TEXT NOT NULL,
  last_source_updated_at TEXT,
  source_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
