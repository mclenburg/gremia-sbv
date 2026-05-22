-- 0033: Manueller Gremia.BR-Lesecache.
-- Der Cache wird ausschließlich nach expliziter Nutzeraktion aktualisiert.

CREATE TABLE IF NOT EXISTS gremia_br_cache_entries (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gremia_br_cache_entries_key ON gremia_br_cache_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_gremia_br_cache_entries_fetched ON gremia_br_cache_entries(fetched_at DESC);
