-- 0041: SBV-Taetigkeitsjournal mit optionaler SBV-Zeit.
-- Komfortvorschlaege duerfen nicht persistiert werden; gespeichert wird erst nach bewusster Bestaetigung.

CREATE TABLE IF NOT EXISTS activity_journal_entries (
  id TEXT PRIMARY KEY,
  entry_date TEXT NOT NULL,
  started_at TEXT NULL,
  ended_at TEXT NULL,
  duration_minutes INTEGER NULL,
  time_mode TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  result_note TEXT NULL,
  confidentiality_level TEXT NOT NULL,
  status TEXT NOT NULL,
  created_from TEXT NOT NULL,
  follow_up_due_at TEXT NULL,
  performed_outside_contract_work_time INTEGER NOT NULL DEFAULT 0,
  exported_for_activity_report_at TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(time_mode IN ('none','duration','range','timer')),
  CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
  CHECK(confidentiality_level IN ('normal','confidential','highly_confidential')),
  CHECK(status IN ('draft','final','follow_up_open')),
  CHECK(created_from IN ('manual','text_command','context_prefill','timer','import')),
  CHECK(duration_minutes IS NULL OR duration_minutes >= 0),
  CHECK(performed_outside_contract_work_time IN (0,1))
);

CREATE TABLE IF NOT EXISTS activity_journal_links (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES activity_journal_entries(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','deadline','document')),
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_journal_category_preferences (
  context_type TEXT PRIMARY KEY CHECK(context_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','deadline','document','journal','fallfrei')),
  category TEXT NOT NULL CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_date ON activity_journal_entries(entry_date DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_category ON activity_journal_entries(category, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_status ON activity_journal_entries(status, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_follow_up ON activity_journal_entries(follow_up_due_at);
CREATE INDEX IF NOT EXISTS idx_activity_journal_entries_exported ON activity_journal_entries(exported_for_activity_report_at);
CREATE INDEX IF NOT EXISTS idx_activity_journal_links_entry ON activity_journal_links(entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_journal_links_target ON activity_journal_links(target_type, target_id);

-- exported_for_activity_report_at ist kein Export-Audit und keine Historie.
-- Der Wert dient nur als letzter bekannter Exportzeitpunkt fuer Taetigkeits- oder Zeitnachweise.
-- Ein gesetzter Wert macht den Eintrag im Retention-Scan gesondert pruefpflichtig.
