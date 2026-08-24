-- Repariert den durch 0044 auf einen gelöschten Legacy-Tabellennamen umgebogenen
-- Fremdschlüssel von generated_documents und ergänzt allgemeine, fallfreie
-- Arbeitgeberverstöße als fachlichen Ausgangskontext.

ALTER TABLE sbv_participation_violation_events RENAME TO sbv_participation_violation_events_0052_legacy;
ALTER TABLE sbv_participation_violation_documents RENAME TO sbv_participation_violation_documents_0052_legacy;
ALTER TABLE sbv_workflow_document_links RENAME TO sbv_workflow_document_links_0052_legacy;
ALTER TABLE generated_documents RENAME TO generated_documents_0052_legacy;
ALTER TABLE sbv_participation_violations RENAME TO sbv_participation_violations_0052_legacy;

CREATE TABLE sbv_participation_violations (
  id TEXT PRIMARY KEY,
  stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
  status TEXT NOT NULL CHECK (status IN ('draft','open','sent','remedied','escalated','closed','withdrawn')),
  violation_type TEXT NOT NULL CHECK (violation_type IN ('not_informed','late_informed','incomplete_information','not_heard','late_heard','implementation_without_participation','repeated_violation','other')),
  source_context_type TEXT NOT NULL CHECK (source_context_type IN ('general_employer_practice','case','case_measure_participation','sbv_participation','termination_hearing','sbv_control_protocol','deadline','activity_journal','recruiting_participation')),
  source_context_id TEXT NOT NULL,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  related_participation_id TEXT REFERENCES sbv_participations(id) ON DELETE SET NULL,
  related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL,
  related_termination_hearing_id TEXT REFERENCES termination_hearings(id) ON DELETE SET NULL,
  related_deadline_id TEXT REFERENCES deadlines(id) ON DELETE SET NULL,
  related_activity_journal_entry_id TEXT REFERENCES activity_journal_entries(id) ON DELETE SET NULL,
  related_sbv_control_protocol_id TEXT REFERENCES sbv_control_protocols(id) ON DELETE SET NULL,
  related_recruiting_participation_id TEXT REFERENCES recruiting_participations(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  measure_description TEXT NOT NULL,
  wrong_behavior TEXT NOT NULL,
  required_behavior TEXT NOT NULL,
  consequence_warning TEXT,
  legal_basis TEXT NOT NULL DEFAULT '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
  follow_up_due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT,
  closed_at TEXT
);

INSERT INTO sbv_participation_violations (
  id, stage, status, violation_type, source_context_type, source_context_id, case_id,
  related_participation_id, related_case_measure_id, related_termination_hearing_id, related_deadline_id,
  related_activity_journal_entry_id, related_sbv_control_protocol_id, related_recruiting_participation_id,
  subject, measure_description, wrong_behavior, required_behavior, consequence_warning,
  legal_basis, follow_up_due_at, created_at, updated_at, sent_at, closed_at
)
SELECT
  id, stage, status, violation_type, source_context_type, source_context_id, case_id,
  related_participation_id, related_case_measure_id, related_termination_hearing_id, related_deadline_id,
  related_activity_journal_entry_id, related_sbv_control_protocol_id, related_recruiting_participation_id,
  subject, measure_description, wrong_behavior, required_behavior, consequence_warning,
  legal_basis, follow_up_due_at, created_at, updated_at, sent_at, closed_at
FROM sbv_participation_violations_0052_legacy;

CREATE TABLE generated_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
  violation_id TEXT REFERENCES sbv_participation_violations(id) ON DELETE SET NULL,
  document_kind TEXT CHECK (document_kind IN ('generic','sbv_participation_violation')) DEFAULT 'generic',
  template_version TEXT,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT,
  mime_type TEXT,
  sha256 TEXT,
  document_key TEXT,
  iv TEXT,
  auth_tag TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL
);

INSERT INTO generated_documents (
  id, case_id, template_id, violation_id, document_kind, template_version, title,
  storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at
)
SELECT
  id, case_id, template_id, violation_id, document_kind, template_version, title,
  storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at
FROM generated_documents_0052_legacy;

CREATE TABLE sbv_participation_violation_events (
  id TEXT PRIMARY KEY,
  violation_id TEXT NOT NULL REFERENCES sbv_participation_violations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','status_changed','document_generated','marked_sent','deadline_created','deadline_closed','remedied','escalated','closed','withdrawn')),
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO sbv_participation_violation_events (id, violation_id, event_type, from_status, to_status, note, created_at)
SELECT id, violation_id, event_type, from_status, to_status, note, created_at FROM sbv_participation_violation_events_0052_legacy;

CREATE TABLE sbv_participation_violation_documents (
  id TEXT PRIMARY KEY,
  violation_id TEXT NOT NULL REFERENCES sbv_participation_violations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE RESTRICT,
  stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
  template_key TEXT NOT NULL,
  template_version TEXT NOT NULL,
  immutable_snapshot INTEGER NOT NULL DEFAULT 1 CHECK (immutable_snapshot IN (0,1)),
  created_at TEXT NOT NULL
);
INSERT INTO sbv_participation_violation_documents (id, violation_id, document_id, stage, template_key, template_version, immutable_snapshot, created_at)
SELECT id, violation_id, document_id, stage, template_key, template_version, immutable_snapshot, created_at FROM sbv_participation_violation_documents_0052_legacy;

CREATE TABLE sbv_workflow_document_links (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('election','meeting','assembly','inclusion_agreement','employer_obligation_review')),
  owner_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  document_class TEXT NOT NULL DEFAULT 'generated_document' CHECK (document_class IN ('generated_document','scanned_copy','external_document','original_physical_reference')),
  template_version TEXT,
  legal_rule_version TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(owner_type, owner_id, document_id, purpose)
);
INSERT INTO sbv_workflow_document_links (id, owner_type, owner_id, document_id, purpose, document_class, template_version, legal_rule_version, created_at)
SELECT id, owner_type, owner_id, document_id, purpose, document_class, template_version, legal_rule_version, created_at FROM sbv_workflow_document_links_0052_legacy;

DROP TABLE sbv_participation_violation_documents_0052_legacy;
DROP TABLE sbv_participation_violation_events_0052_legacy;
DROP TABLE sbv_workflow_document_links_0052_legacy;
DROP TABLE generated_documents_0052_legacy;
DROP TABLE sbv_participation_violations_0052_legacy;

CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_status ON sbv_participation_violations(status);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_stage ON sbv_participation_violations(stage);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_source ON sbv_participation_violations(source_context_type, source_context_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_case ON sbv_participation_violations(case_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_case_measure ON sbv_participation_violations(related_case_measure_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_recruiting ON sbv_participation_violations(related_recruiting_participation_id);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violation_events_violation ON sbv_participation_violation_events(violation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sbv_participation_violation_documents_violation ON sbv_participation_violation_documents(violation_id);
CREATE INDEX IF NOT EXISTS idx_sbv_workflow_document_links_owner ON sbv_workflow_document_links(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_sbv_workflow_document_links_document ON sbv_workflow_document_links(document_id);
