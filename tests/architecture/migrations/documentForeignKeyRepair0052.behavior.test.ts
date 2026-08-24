import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

function createPre0044Database(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE cases (id TEXT PRIMARY KEY);
    CREATE TABLE templates (id TEXT PRIMARY KEY);
    CREATE TABLE sbv_participations (id TEXT PRIMARY KEY);
    CREATE TABLE termination_hearings (id TEXT PRIMARY KEY);
    CREATE TABLE deadlines (id TEXT PRIMARY KEY);
    CREATE TABLE activity_journal_entries (id TEXT PRIMARY KEY);
    CREATE TABLE sbv_control_protocols (id TEXT PRIMARY KEY);
    CREATE TABLE case_measures (id TEXT PRIMARY KEY);
    CREATE TABLE recruiting_participations (id TEXT PRIMARY KEY);

    CREATE TABLE sbv_participation_violations (
      id TEXT PRIMARY KEY,
      stage TEXT NOT NULL,
      status TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      source_context_type TEXT NOT NULL,
      source_context_id TEXT NOT NULL,
      case_id TEXT,
      related_participation_id TEXT,
      related_termination_hearing_id TEXT,
      related_deadline_id TEXT,
      related_activity_journal_entry_id TEXT,
      related_sbv_control_protocol_id TEXT,
      subject TEXT NOT NULL,
      measure_description TEXT NOT NULL,
      wrong_behavior TEXT NOT NULL,
      required_behavior TEXT NOT NULL,
      consequence_warning TEXT,
      legal_basis TEXT NOT NULL,
      follow_up_due_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sent_at TEXT,
      closed_at TEXT
    );
    CREATE TABLE sbv_participation_violation_events (
      id TEXT PRIMARY KEY, violation_id TEXT NOT NULL, event_type TEXT NOT NULL,
      from_status TEXT, to_status TEXT, note TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE generated_documents (
      id TEXT PRIMARY KEY,
      case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
      template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
      violation_id TEXT REFERENCES sbv_participation_violations(id) ON DELETE SET NULL,
      document_kind TEXT DEFAULT 'generic', template_version TEXT, title TEXT NOT NULL,
      storage_path TEXT NOT NULL, filename TEXT, mime_type TEXT, sha256 TEXT,
      document_key TEXT, iv TEXT, auth_tag TEXT, size_bytes INTEGER, created_at TEXT NOT NULL
    );
    CREATE TABLE sbv_participation_violation_documents (
      id TEXT PRIMARY KEY, violation_id TEXT NOT NULL, document_id TEXT NOT NULL,
      stage TEXT NOT NULL, template_key TEXT NOT NULL, template_version TEXT NOT NULL,
      immutable_snapshot INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    INSERT INTO sbv_participation_violations VALUES (
      'violation-1','request','open','not_heard','sbv_control_protocol','protocol-1',NULL,
      NULL,NULL,NULL,NULL,NULL,'Betreff','Sachverhalt','Falsch','Richtig',NULL,
      '§ 178 Abs. 2 SGB IX',NULL,'2026-01-01','2026-01-01',NULL,NULL
    );
    INSERT INTO generated_documents VALUES (
      'document-1',NULL,NULL,'violation-1','sbv_participation_violation','v1','Dokument',
      '/vault/document-1.gsbvdoc','dokument.pdf','application/pdf','hash','key','iv','tag',42,'2026-01-01'
    );
    INSERT INTO sbv_participation_violation_documents VALUES (
      'link-violation','violation-1','document-1','request','request','v1',1,'2026-01-01'
    );
  `);
  db.exec(fs.readFileSync('database/migrations/0044_participation_violation_measure_context.sql', 'utf8'));
  db.exec(`
    ALTER TABLE sbv_participation_violations ADD COLUMN related_recruiting_participation_id TEXT;
    CREATE TABLE sbv_workflow_document_links (
      id TEXT PRIMARY KEY, owner_type TEXT NOT NULL, owner_id TEXT NOT NULL,
      document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL, document_class TEXT NOT NULL DEFAULT 'generated_document',
      template_version TEXT, legal_rule_version TEXT, created_at TEXT NOT NULL,
      UNIQUE(owner_type, owner_id, document_id, purpose)
    );
    INSERT INTO sbv_workflow_document_links VALUES (
      'workflow-link','election','election-1','document-1','Wahlakte','generated_document','v1','2026','2026-01-01'
    );
    PRAGMA foreign_keys = ON;
  `);
  return db;
}

describe('Migration 0052 repariert zentrale Dokument-Fremdschlüssel', () => {
  it('erhält Bestandsdaten und verweist danach nur auf aktuelle Tabellen', () => {
    const db = createPre0044Database();
    const brokenTarget = db.prepare("PRAGMA foreign_key_list('generated_documents')").all()
      .find((row) => (row as { from: string }).from === 'violation_id') as { table: string };
    expect(brokenTarget.table).toBe('sbv_participation_violations_0044_legacy');

    db.exec(fs.readFileSync('database/migrations/0052_document_foreign_key_and_general_violations.sql', 'utf8'));

    const repairedTarget = db.prepare("PRAGMA foreign_key_list('generated_documents')").all()
      .find((row) => (row as { from: string }).from === 'violation_id') as { table: string };
    expect(repairedTarget.table).toBe('sbv_participation_violations');
    expect(db.prepare('SELECT COUNT(*) AS count FROM generated_documents').get()).toEqual({ count: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM sbv_participation_violation_documents').get()).toEqual({ count: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM sbv_workflow_document_links').get()).toEqual({ count: 1 });
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);

    db.exec(`
      INSERT INTO sbv_participation_violations (
        id,stage,status,violation_type,source_context_type,source_context_id,subject,
        measure_description,wrong_behavior,required_behavior,legal_basis,created_at,updated_at
      ) VALUES (
        'general-1','request','draft','other','general_employer_practice','general-1',
        'Allgemeine Praxis','Sachverhalt','Falsch','Richtig','§ 178 Abs. 2 SGB IX','2026-01-02','2026-01-02'
      );
      INSERT INTO generated_documents (
        id,document_kind,title,storage_path,filename,mime_type,sha256,document_key,iv,auth_tag,size_bytes,created_at
      ) VALUES (
        'office-document','generic','Einladung','/vault/office.gsbvdoc','einladung.pdf',
        'application/pdf','hash','key','iv','tag',100,'2026-01-02'
      );
    `);
    expect(db.prepare("SELECT source_context_type FROM sbv_participation_violations WHERE id = 'general-1'").get())
      .toEqual({ source_context_type: 'general_employer_practice' });
  });
});
