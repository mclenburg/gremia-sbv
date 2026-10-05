import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const timestamp = '2026-07-01T08:00:00.000Z';

function openDatabase(mode: 'fresh' | 'migration'): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(readFileSync('database/schema.sql', 'utf8'));
  if (mode === 'migration') {
    // Nur die Verstoßstrukturen werden auf den Stand vor 0042 zurückgesetzt.
    // Die echten Elterntabellen und die zentrale Dokumentablage bleiben erhalten.
    db.exec(`
      DROP TABLE sbv_participation_violation_documents;
      DROP TABLE sbv_participation_violation_events;
      DROP TABLE sbv_participation_violations;
      ALTER TABLE generated_documents DROP COLUMN violation_id;
      ALTER TABLE generated_documents DROP COLUMN document_kind;
      ALTER TABLE generated_documents DROP COLUMN template_version;
    `);
    db.exec(readFileSync('database/migrations/0042_sbv_participation_violations.sql', 'utf8'));
  }
  return db;
}

function insertViolation(db: DatabaseSync, context = 'case', extra: Record<string, string> = {}) {
  const columns = Object.keys(extra);
  db.prepare(`INSERT INTO sbv_participation_violations
    (id, stage, status, violation_type, source_context_type, source_context_id,
     subject, measure_description, wrong_behavior, required_behavior, created_at, updated_at
     ${columns.map((column) => `, ${column}`).join('')})
    VALUES ('violation-1', 'request', 'open', 'not_heard', ?, 'source-1',
      'Anhörung fehlt', 'Arbeitgebermaßnahme', 'Entscheidung ohne Anhörung',
      'SBV anhören', ?, ?${columns.map(() => ', ?').join('')})`)
    .run(context, timestamp, timestamp, ...Object.values(extra));
}

function insertDocumentEvidence(db: DatabaseSync) {
  db.prepare(`INSERT INTO generated_documents
    (id, violation_id, document_kind, template_version, title, storage_path, created_at)
    VALUES ('document-1', 'violation-1', 'sbv_participation_violation', 'v1',
      'Anhörung nachfordern', '/synthetic/document-1.gsbvdoc', ?)`).run(timestamp);
  db.prepare(`INSERT INTO sbv_participation_violation_documents
    (id, violation_id, document_id, stage, template_key, template_version, created_at)
    VALUES ('link-1', 'violation-1', 'document-1', 'request', 'request', 'v1', ?)`).run(timestamp);
  db.prepare(`INSERT INTO sbv_participation_violation_events
    (id, violation_id, event_type, note, created_at)
    VALUES ('event-1', 'violation-1', 'created', 'Anhörung fehlt', ?)`).run(timestamp);
}

for (const mode of ['fresh', 'migration'] as const) {
  describe(`Beteiligungsverstoß-Persistenz: ${mode}`, () => {
    let db: DatabaseSync;
    beforeEach(() => { db = openDatabase(mode); });
    afterEach(() => db.close());

    it.each(['case', 'sbv_participation', 'termination_hearing', 'sbv_control_protocol', 'deadline', 'activity_journal'])
      ('speichert den fachlichen Ausgangskontext %s', (context) => {
        insertViolation(db, context);
        expect(db.prepare('SELECT source_context_type, subject FROM sbv_participation_violations').get()).toEqual({
          source_context_type: context, subject: 'Anhörung fehlt',
        });
      });

    it('weist einen unbekannten Ausgangskontext ohne Speicherung zurück', () => {
      expect(() => insertViolation(db, 'unsupported_context')).toThrow();
      expect(db.prepare('SELECT COUNT(*) AS count FROM sbv_participation_violations').get()).toEqual({ count: 0 });
    });

    it.each([
      { column: 'case_id', table: 'cases', seed: `INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at) VALUES ('parent-1', 'TEST-001', 'Anonyme Anfrage', 'beratung', '${timestamp}', '${timestamp}', '${timestamp}')` },
      { column: 'related_deadline_id', table: 'deadlines', seed: `INSERT INTO deadlines (id, title, due_at, created_at, updated_at) VALUES ('parent-1', 'Nachfassen', '${timestamp}', '${timestamp}', '${timestamp}')` },
      { column: 'related_activity_journal_entry_id', table: 'activity_journal_entries', seed: `INSERT INTO activity_journal_entries (id, entry_date, time_mode, category, title, confidentiality_level, status, created_from, created_at, updated_at) VALUES ('parent-1', '2026-07-01', 'none', 'documentation', 'Anhörung prüfen', 'normal', 'draft', 'manual', '${timestamp}', '${timestamp}')` },
    ])('erhält den Verstoß beim Löschen des Bezugs $column', ({ column, table, seed }) => {
      db.exec(seed);
      insertViolation(db, 'case', { [column]: 'parent-1' });
      expect(db.prepare(`SELECT ${column} AS reference FROM sbv_participation_violations`).get()).toEqual({ reference: 'parent-1' });
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run('parent-1');
      expect(db.prepare(`SELECT ${column} AS reference, subject FROM sbv_participation_violations`).get()).toEqual({
        reference: null, subject: 'Anhörung fehlt',
      });
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    });

    it('weist einen nicht vorhandenen Fallbezug zurück', () => {
      expect(() => insertViolation(db, 'case', { case_id: 'missing-case' })).toThrow();
      expect(db.prepare('SELECT COUNT(*) AS count FROM sbv_participation_violations').get()).toEqual({ count: 0 });
    });

    it('speichert versionierte Dokumentnachweise und schützt sie vor vorzeitigem Löschen', () => {
      insertViolation(db);
      insertDocumentEvidence(db);
      expect(db.prepare(`SELECT document_kind, template_version, title FROM generated_documents`).get()).toEqual({
        document_kind: 'sbv_participation_violation', template_version: 'v1', title: 'Anhörung nachfordern',
      });
      expect(db.prepare('SELECT immutable_snapshot FROM sbv_participation_violation_documents').get()).toEqual({ immutable_snapshot: 1 });
      expect(() => db.prepare("UPDATE generated_documents SET document_kind = 'unsupported_kind' WHERE id = ?").run('document-1')).toThrow();
      expect(() => db.prepare('UPDATE sbv_participation_violation_documents SET immutable_snapshot = 2 WHERE id = ?').run('link-1')).toThrow();
      expect(() => db.prepare('DELETE FROM generated_documents WHERE id = ?').run('document-1')).toThrow();
      expect(db.prepare('SELECT COUNT(*) AS count FROM generated_documents').get()).toEqual({ count: 1 });
    });

    it('entfernt Ereignisse und Nachweisverknüpfungen beim Löschen des Verstoßes', () => {
      insertViolation(db);
      insertDocumentEvidence(db);
      db.prepare('DELETE FROM sbv_participation_violations WHERE id = ?').run('violation-1');
      expect(db.prepare('SELECT COUNT(*) AS count FROM sbv_participation_violation_events').get()).toEqual({ count: 0 });
      expect(db.prepare('SELECT COUNT(*) AS count FROM sbv_participation_violation_documents').get()).toEqual({ count: 0 });
      expect(db.prepare('SELECT violation_id FROM generated_documents').get()).toEqual({ violation_id: null });
      db.prepare('DELETE FROM generated_documents WHERE id = ?').run('document-1');
      expect(db.prepare('SELECT COUNT(*) AS count FROM generated_documents').get()).toEqual({ count: 0 });
    });
  });
}

it('erhält Altbestand und Dokumentnachweise bei der Maßnahmennachrüstung samt Fremdschlüsselreparatur', () => {
  const db = openDatabase('migration');
  try {
    insertViolation(db);
    insertDocumentEvidence(db);
    // Historische Tabellenumbauten werden durch die spätere Reparatur 0052 vervollständigt.
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(readFileSync('database/migrations/0044_participation_violation_measure_context.sql', 'utf8'));
    db.exec(readFileSync('database/migrations/0047_participation_violation_recruiting_context.sql', 'utf8'));
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(readFileSync('database/migrations/0052_document_foreign_key_and_general_violations.sql', 'utf8'));
    db.exec('PRAGMA foreign_keys = ON');
    expect(db.prepare('SELECT subject, related_case_measure_id FROM sbv_participation_violations').get()).toEqual({
      subject: 'Anhörung fehlt', related_case_measure_id: null,
    });
    expect(db.prepare('SELECT note FROM sbv_participation_violation_events').get()).toEqual({ note: 'Anhörung fehlt' });
    expect(db.prepare('SELECT document_id, template_version FROM sbv_participation_violation_documents').get()).toEqual({
      document_id: 'document-1', template_version: 'v1',
    });
    db.exec(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
      VALUES ('case-1', 'TEST-002', 'Anonyme Anfrage', 'beratung', '${timestamp}', '${timestamp}', '${timestamp}');
      INSERT INTO case_measures (id, case_id, type, title, opened_at, created_at, updated_at)
      VALUES ('measure-1', 'case-1', 'sbv_participation', 'Anhörung', '${timestamp}', '${timestamp}', '${timestamp}');`);
    db.prepare(`UPDATE sbv_participation_violations SET source_context_type = 'case_measure_participation',
      source_context_id = 'measure-1', related_case_measure_id = 'measure-1' WHERE id = 'violation-1'`).run();
    db.prepare('DELETE FROM case_measures WHERE id = ?').run('measure-1');
    expect(db.prepare('SELECT source_context_type, related_case_measure_id FROM sbv_participation_violations').get()).toEqual({
      source_context_type: 'case_measure_participation', related_case_measure_id: null,
    });
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  } finally {
    db.close();
  }
});
