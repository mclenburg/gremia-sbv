-- 0054: Nachvollziehbare Gremia.BR-Arbeitsbereichsaktionen.

CREATE TABLE IF NOT EXISTS gremia_br_workspace_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN ('document_uploaded','document_shared','agenda_item_requested','information_requested')),
  local_document_id TEXT REFERENCES generated_documents(id) ON DELETE SET NULL,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  target_body_id TEXT,
  target_body_name TEXT,
  target_security_domain TEXT,
  remote_document_id TEXT,
  remote_share_id TEXT,
  remote_meeting_id TEXT,
  remote_agenda_version_id TEXT,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploaded','shared','requested','failed')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gremia_br_workspace_actions_document ON gremia_br_workspace_actions(local_document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gremia_br_workspace_actions_case ON gremia_br_workspace_actions(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gremia_br_workspace_actions_target ON gremia_br_workspace_actions(target_security_domain, created_at);
