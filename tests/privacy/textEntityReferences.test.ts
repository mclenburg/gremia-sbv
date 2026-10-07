import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openTestDatabase } from '../helpers/openTestDatabase';
import { TextEntityReferenceService } from '../../services/textEntityReferenceService';
import { PersonAnonymizationService } from '../../services/personAnonymizationService';
import { DatabaseUnitOfWork } from '../../services/databaseUnitOfWork';
import type { DatabaseAdapter } from '../../services/databaseService';

async function seededDatabase() {
  const db = await openTestDatabase();
  db.exec(readFileSync('database/schema.sql', 'utf8'));
  const now = '2026-08-15T12:00:00.000Z';
  for (const id of ['person-1', 'person-2']) {
    db.prepare("INSERT INTO protected_persons (id, created_at, updated_at, first_name, last_name, protection_status) VALUES (?, ?, ?, 'Arno', 'Nym', 'severely_disabled')")
      .run(id, now, now);
  }
  db.prepare("INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at) VALUES ('case-1', 'SBV-2026-001', 'Beratung', 'beratung', ?, ?, ?)")
    .run(now, now, now);
  db.prepare("INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, notes, created_at, updated_at) VALUES ('meeting-1', 'works_council', 'Sitzung', ?, '', ?, ?)")
    .run(now, now, now);
  return db;
}

function meetingNotes(db: DatabaseAdapter): string {
  return db.prepare<{ notes: string }>("SELECT notes FROM sbv_meetings WHERE id = 'meeting-1'").get()!.notes;
}

describe('Verknüpfungen in bearbeitbaren Freitexten', () => {
  it('unterscheidet gleichnamige Personen und ersetzt nur den gezielt verknüpften Verweis', async () => {
    const db = await seededDatabase();
    try {
      const service = new TextEntityReferenceService(db);
      const first = service.create('person', 'person-1');
      const second = service.create('person', 'person-2');
      expect(first).not.toBe(second);
      expect(service.create('person', 'person-1')).toBe(first);
      const note = `Arno Nym wurde erwähnt. ${first} und ${second} sind verknüpft.`;
      db.prepare("UPDATE sbv_meetings SET notes = ? WHERE id = 'meeting-1'").run(note);
      db.prepare("INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps) VALUES ('note-1', 'case-1', 'SBV-2026-001', 'Notiz', '', ?, '')").run(note);

      new PersonAnonymizationService(db).anonymizeStructuredPersonData('person-1', `Zweck entfallen: ${first}`);

      expect(meetingNotes(db)).toBe(`Arno Nym wurde erwähnt. [anonymisiert] und ${second} sind verknüpft.`);
      expect(db.prepare<{ content: string }>("SELECT content FROM case_notes_fts WHERE id = 'note-1'").get()!.content)
        .toBe(`Arno Nym wurde erwähnt. [anonymisiert] und ${second} sind verknüpft.`);
      expect(db.prepare<{ anonymization_reason: string }>('SELECT anonymization_reason FROM protected_persons WHERE id = ?').get('person-1')!.anonymization_reason)
        .toBe('Zweck entfallen: [anonymisiert]');
      expect(db.prepare<{ marker: string }>('SELECT marker FROM text_entity_references WHERE entity_id = ?').get('person-1')).toBeUndefined();
    } finally { db.close(); }
  });

  it('ersetzt Personen- und Fallverweise auch bei Löschung und lässt normalen Text stehen', async () => {
    const db = await seededDatabase();
    try {
      const service = new TextEntityReferenceService(db);
      const person = service.create('person', 'person-1');
      const caseMarker = service.create('case', 'case-1');
      db.prepare("UPDATE sbv_meetings SET notes = ? WHERE id = 'meeting-1'").run(`Arno Nym, ${person}, ${caseMarker}`);

      new PersonAnonymizationService(db).deleteStructuredPersonData('person-1', 'Zweck entfallen');
      service.redact('case', 'case-1');

      expect(meetingNotes(db)).toBe('Arno Nym, [anonymisiert], [anonymisiert]');
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM text_entity_references').get()!.count).toBe(0);
    } finally { db.close(); }
  });

  it('nimmt die Ersetzung bei einem fehlgeschlagenen Löschvorgang zurück', async () => {
    const db = await seededDatabase();
    try {
      const service = new TextEntityReferenceService(db);
      const marker = service.create('person', 'person-1');
      db.prepare("UPDATE sbv_meetings SET notes = ? WHERE id = 'meeting-1'").run(marker);
      expect(() => new DatabaseUnitOfWork(db).run(() => {
        service.redact('person', 'person-1');
        throw new Error('Abbruch');
      })).toThrow('Abbruch');
      expect(meetingNotes(db)).toBe(marker);
      expect(service.create('person', 'person-1')).toBe(marker);
    } finally { db.close(); }
  });
});
