-- ============================================================
-- Gremia.SBV 0.3: Fristen- und Wiedervorlagenzentrale
-- ============================================================

PRAGMA foreign_keys = ON;

-- Bestehende MVP-Fristentabelle wird vorsichtig erweitert.
ALTER TABLE deadlines ADD COLUMN person_id TEXT REFERENCES persons(id) ON DELETE SET NULL;
ALTER TABLE deadlines ADD COLUMN process_id TEXT;
ALTER TABLE deadlines ADD COLUMN process_type TEXT NOT NULL DEFAULT 'case';
ALTER TABLE deadlines ADD COLUMN deadline_type TEXT NOT NULL DEFAULT 'follow_up';
ALTER TABLE deadlines ADD COLUMN description TEXT;
ALTER TABLE deadlines ADD COLUMN source_event TEXT;
ALTER TABLE deadlines ADD COLUMN calculation_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE deadlines ADD COLUMN is_legal_deadline INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deadlines ADD COLUMN is_user_editable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE deadlines ADD COLUMN completed_at TEXT;
ALTER TABLE deadlines ADD COLUMN completed_note TEXT;
ALTER TABLE deadlines ADD COLUMN cancelled_at TEXT;
ALTER TABLE deadlines ADD COLUMN cancelled_reason TEXT;
ALTER TABLE deadlines ADD COLUMN warning_threshold_hours INTEGER NOT NULL DEFAULT 48;
ALTER TABLE deadlines ADD COLUMN critical_threshold_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE deadlines ADD COLUMN dashboard_from_at TEXT;
ALTER TABLE deadlines ADD COLUMN confidential_title TEXT;

CREATE TABLE IF NOT EXISTS deadline_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  confidential_title TEXT,
  description TEXT,
  process_type TEXT NOT NULL,
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('legal_deadline', 'follow_up', 'appointment', 'warning', 'workflow_step')) DEFAULT 'follow_up',
  offset_days INTEGER NOT NULL DEFAULT 0,
  offset_hours INTEGER NOT NULL DEFAULT 0,
  reminder_days_before INTEGER,
  legal_basis TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('normal', 'important', 'critical', 'fatal')) DEFAULT 'normal',
  is_legal_deadline INTEGER NOT NULL DEFAULT 0,
  warning_threshold_hours INTEGER NOT NULL DEFAULT 48,
  critical_threshold_hours INTEGER NOT NULL DEFAULT 24,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deadline_audit (
  id TEXT PRIMARY KEY,
  deadline_id TEXT NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deadlines_status_due_at ON deadlines(status, due_at);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_person_id ON deadlines(person_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_process ON deadlines(process_type, process_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_dashboard_from_at ON deadlines(dashboard_from_at);
CREATE INDEX IF NOT EXISTS idx_deadline_templates_process_type ON deadline_templates(process_type);
CREATE INDEX IF NOT EXISTS idx_deadline_audit_deadline_id ON deadline_audit(deadline_id);

-- Standardvorlagen: bewusst fachlich konservativ. Rechts-/Klagefristen bleiben prüfungspflichtig.
INSERT OR IGNORE INTO deadline_templates (
  id, template_key, title, confidential_title, description, process_type, deadline_type,
  offset_days, offset_hours, reminder_days_before, legal_basis, severity, is_legal_deadline,
  warning_threshold_hours, critical_threshold_hours, created_at, updated_at
) VALUES
('tpl-bem-response-check', 'bem.response.check', 'BEM-Rückmeldung prüfen', 'Gremia.SBV: BEM-Wiedervorlage', 'Nach Einladung prüfen, ob eine Rückmeldung vorliegt oder freundlich nachgefasst werden sollte.', 'bem', 'follow_up', 14, 0, 2, '§ 167 Abs. 2 SGB IX', 'important', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-bem-first-meeting', 'bem.first.meeting.prepare', 'BEM-Erstgespräch vorbereiten', 'Gremia.SBV: BEM-Termin vorbereiten', 'Vorbereitung von Rollenklärung, Datenschutz, Freiwilligkeit und möglichen Maßnahmen.', 'bem', 'workflow_step', 0, 0, 2, '§ 167 Abs. 2 SGB IX', 'important', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-bem-evaluation', 'bem.measure.evaluate', 'BEM-Maßnahme evaluieren', 'Gremia.SBV: Maßnahme evaluieren', 'Wirksamkeit vereinbarter Maßnahme prüfen und dokumentieren.', 'bem', 'follow_up', 28, 0, 7, '§ 167 Abs. 2 SGB IX', 'normal', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-prevention-employer-response', 'prevention.employer.response', 'Arbeitgeberreaktion Präventionsverfahren prüfen', 'Gremia.SBV: Prävention nachfassen', 'Bei Gefährdung des Arbeitsverhältnisses Reaktion und Einbindung von SBV/BR/Inklusionsamt prüfen.', 'prevention', 'follow_up', 7, 0, 2, '§ 167 Abs. 1 SGB IX', 'critical', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-prevention-integration-office', 'prevention.integration.office.followup', 'Inklusionsamt nachfassen', 'Gremia.SBV: Inklusionsamt nachfassen', 'Sachstand zur Einschaltung oder Beratung des Inklusionsamts prüfen.', 'prevention', 'follow_up', 14, 0, 3, '§ 167 Abs. 1 SGB IX, § 185 SGB IX', 'critical', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-termination-sbv-statement', 'termination.sbv.statement', 'SBV-Stellungnahme Kündigungsanhörung', 'Gremia.SBV: kritische Frist', 'Kritischer Kündigungsvorgang: vollständige Unterrichtung, Integrationsamt und Stellungnahme prüfen.', 'termination_hearing', 'legal_deadline', 7, 0, 1, '§ 178 Abs. 2 Satz 1 SGB IX, § 178 Abs. 2 Satz 3 SGB IX, § 168 SGB IX', 'fatal', 1, 48, 24, datetime('now'), datetime('now')),
('tpl-termination-claim-warning', 'termination.claim.warning', 'Klagefrist-Hinweis prüfen', 'Gremia.SBV: Klagefrist-Hinweis', 'Betroffene Person auf anwaltliche Prüfung der Drei-Wochen-Frist hinweisen; Zugang und Sonderkonstellationen prüfen.', 'termination_hearing', 'warning', 21, 0, 7, '§ 4 KSchG, § 168 SGB IX', 'critical', 1, 72, 48, datetime('now'), datetime('now')),
('tpl-equalization-receipt', 'equalization.receipt.check', 'Eingangsbestätigung Gleichstellungsantrag prüfen', 'Gremia.SBV: Gleichstellung Wiedervorlage', 'Nach Antragstellung prüfen, ob Eingangsbestätigung der Agentur für Arbeit vorliegt.', 'equalization', 'follow_up', 14, 0, 3, '§ 2 Abs. 3 SGB IX', 'important', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-equalization-status', 'equalization.status.followup', 'Sachstand Gleichstellungsantrag prüfen', 'Gremia.SBV: Gleichstellung Sachstand', 'Sachstand bei längerer Bearbeitung prüfen und Unterstützungsbedarf klären.', 'equalization', 'follow_up', 28, 0, 7, '§ 2 Abs. 3 SGB IX', 'normal', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-equalization-objection', 'equalization.objection.deadline', 'Widerspruchsfrist Gleichstellungsbescheid prüfen', 'Gremia.SBV: Widerspruchsfrist prüfen', 'Frist aus Bescheid und Zugang prüfen; keine automatische Rechtsberatung.', 'equalization', 'legal_deadline', 30, 0, 7, 'SGG / Rechtsbehelfsbelehrung prüfen', 'critical', 1, 72, 48, datetime('now'), datetime('now')),
('tpl-gdb-objection', 'gdb.objection.deadline', 'Widerspruchsfrist GdB-Bescheid prüfen', 'Gremia.SBV: Widerspruchsfrist prüfen', 'Frist aus Bescheid und Zugang prüfen; SBV unterstützt, ersetzt aber keine Rechtsvertretung.', 'gdb', 'legal_deadline', 30, 0, 7, 'SGB IX / SGG / Rechtsbehelfsbelehrung prüfen', 'critical', 1, 72, 48, datetime('now'), datetime('now')),
('tpl-employer-response', 'general.employer.response', 'Arbeitgeberantwort nachfassen', 'Gremia.SBV: Arbeitgeberantwort', 'Freundlich und verbindlich nachfassen, wenn Unterlagen oder Antwort zugesagt wurden.', 'case', 'follow_up', 14, 0, 3, '§ 178 Abs. 2 Satz 1 SGB IX', 'important', 0, 48, 24, datetime('now'), datetime('now')),
('tpl-general-followup', 'general.followup', 'Allgemeine Wiedervorlage', 'Gremia.SBV: Wiedervorlage', 'Freie Wiedervorlage ohne starre Rechtsfrist.', 'case', 'follow_up', 7, 0, 2, NULL, 'normal', 0, 48, 24, datetime('now'), datetime('now'));
