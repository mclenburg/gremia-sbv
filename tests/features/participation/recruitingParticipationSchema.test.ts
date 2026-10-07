import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const timestamp = '2026-07-01T08:00:00.000Z';

for (const schemaPath of ['database/schema.sql', 'database/migrations/0045_recruiting_participations.sql']) {
  describe(`Stellenbesetzungs-Persistenz: ${schemaPath}`, () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      db.exec('PRAGMA foreign_keys = ON');
      db.exec(readFileSync(schemaPath, 'utf8'));
      db.prepare(`INSERT INTO recruiting_participations (id, vacancy_title, created_at, updated_at)
        VALUES ('recruiting-1', 'IT Service Desk', ?, ?)`).run(timestamp, timestamp);
    });

    afterEach(() => db.close());

    function addInterview(extraSql = '', extraValues: Array<string | number> = []) {
      db.prepare(`INSERT INTO recruiting_interview_events
        (id, recruiting_participation_id, interview_date, applicant_ref, created_at, updated_at${extraSql})
        VALUES ('interview-1', 'recruiting-1', ?, 'Bewerbung A', ?, ?${extraValues.map(() => ', ?').join('')})`)
        .run(timestamp, timestamp, timestamp, ...extraValues);
    }

    it('speichert eine fallunabhängige Stellenbesetzung mit datensparsamen Vorgaben', () => {
      addInterview();
      expect(db.prepare('SELECT status, documents_complete, interview_count, flagged_for_violation_review FROM recruiting_participations').get()).toEqual({
        status: 'draft', documents_complete: 0, interview_count: 0, flagged_for_violation_review: 0,
      });
      expect(db.prepare('SELECT applicant_ref, applicant_reference_mode, applicant_status, accessibility_check_status, procedural_note FROM recruiting_interview_events').get()).toEqual({
        applicant_ref: 'Bewerbung A', applicant_reference_mode: 'anonymous_reference',
        applicant_status: 'unknown_or_not_relevant', accessibility_check_status: 'not_checked', procedural_note: null,
      });
    });

    it('liest Barrierefreiheitsnachhaltung und Verstoßmarkierung unverändert zurück', () => {
      addInterview(', accessibility_check_status, procedural_note, follow_up_needed', ['follow_up_needed', 'Barrierefreies Format nachfordern.', 1]);
      db.prepare('UPDATE recruiting_participations SET flagged_for_violation_review = 1, interview_count = 1 WHERE id = ?').run('recruiting-1');
      expect(db.prepare('SELECT accessibility_check_status, procedural_note, follow_up_needed FROM recruiting_interview_events').get()).toEqual({
        accessibility_check_status: 'follow_up_needed', procedural_note: 'Barrierefreies Format nachfordern.', follow_up_needed: 1,
      });
      expect(db.prepare('SELECT flagged_for_violation_review, interview_count FROM recruiting_participations').get()).toEqual({
        flagged_for_violation_review: 1, interview_count: 1,
      });
    });

    it('verlangt eine Bewerbungsreferenz und einen bestehenden Elternvorgang', () => {
      const insert = db.prepare(`INSERT INTO recruiting_interview_events
        (id, recruiting_participation_id, interview_date, applicant_ref, created_at, updated_at)
        VALUES ('invalid-interview', ?, ?, ?, ?, ?)`);
      expect(() => insert.run('recruiting-1', timestamp, null, timestamp, timestamp)).toThrow();
      expect(() => insert.run('unknown-parent', timestamp, 'Bewerbung B', timestamp, timestamp)).toThrow();
      expect(db.prepare('SELECT COUNT(*) AS count FROM recruiting_interview_events').get()).toEqual({ count: 0 });
    });

    it.each([
      ['applicant_reference_mode', 'medical_record'],
      ['accessibility_check_status', 'unknown_status'],
      ['applicant_status', 'diagnosed'],
      ['sbv_invited', 2],
    ])('weist ungültige Werte für %s ohne Speicherung zurück', (column, invalid) => {
      expect(() => addInterview(`, ${column}`, [invalid])).toThrow();
      expect(db.prepare('SELECT COUNT(*) AS count FROM recruiting_interview_events').get()).toEqual({ count: 0 });
    });

    it('stellt keine Speicherfelder für Diagnosen oder Gesprächsprotokolle bereit', () => {
      for (const column of ['diagnose', 'gdb', 'gesundheitsdaten', 'conversation_protocol', 'interview_transcript']) {
        expect(() => addInterview(`, ${column}`, ['Nicht speichern'])).toThrow();
      }
      expect(db.prepare('SELECT COUNT(*) AS count FROM recruiting_interview_events').get()).toEqual({ count: 0 });
    });

    it('entfernt Vorstellungsgespräche beim Löschen des Elternvorgangs', () => {
      addInterview();
      db.prepare('DELETE FROM recruiting_participations WHERE id = ?').run('recruiting-1');
      expect(db.prepare('SELECT COUNT(*) AS count FROM recruiting_participations').get()).toEqual({ count: 0 });
      expect(db.prepare('SELECT COUNT(*) AS count FROM recruiting_interview_events').get()).toEqual({ count: 0 });
    });

    it('erhält vorhandene Datensätze bei wiederholter Schemaanlage', () => {
      addInterview(', procedural_note', ['SBV wurde eingeladen.']);
      db.exec(readFileSync(schemaPath, 'utf8'));
      expect(db.prepare('SELECT vacancy_title FROM recruiting_participations').get()).toEqual({ vacancy_title: 'IT Service Desk' });
      expect(db.prepare('SELECT applicant_ref, procedural_note FROM recruiting_interview_events').get()).toEqual({
        applicant_ref: 'Bewerbung A', procedural_note: 'SBV wurde eingeladen.',
      });
    });
  });
}
