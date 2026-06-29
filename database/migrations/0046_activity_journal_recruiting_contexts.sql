PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS activity_journal_links_rebuild_0046 (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES activity_journal_entries(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','recruiting_participation','recruiting_interview','deadline','document')),
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(entry_id, target_type, target_id)
);

INSERT OR IGNORE INTO activity_journal_links_rebuild_0046 (id, entry_id, target_type, target_id, created_at)
SELECT id, entry_id, target_type, target_id, created_at
FROM activity_journal_links;

DROP TABLE activity_journal_links;
ALTER TABLE activity_journal_links_rebuild_0046 RENAME TO activity_journal_links;

CREATE INDEX IF NOT EXISTS idx_activity_journal_links_entry ON activity_journal_links(entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_journal_links_target ON activity_journal_links(target_type, target_id);

CREATE TABLE IF NOT EXISTS activity_journal_category_preferences_rebuild_0046 (
  context_type TEXT PRIMARY KEY CHECK(context_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','recruiting_participation','recruiting_interview','deadline','document','journal','fallfrei')),
  category TEXT NOT NULL CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
  updated_at TEXT NOT NULL
);

INSERT OR REPLACE INTO activity_journal_category_preferences_rebuild_0046 (context_type, category, updated_at)
SELECT context_type, category, updated_at
FROM activity_journal_category_preferences;

DROP TABLE activity_journal_category_preferences;
ALTER TABLE activity_journal_category_preferences_rebuild_0046 RENAME TO activity_journal_category_preferences;

PRAGMA foreign_keys=on;
