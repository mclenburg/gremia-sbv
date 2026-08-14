import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContactService } from '../../../services/contactService';
import { ensurePersonalDataAuditSchema, PersonalDataAuditLogService } from '../../../services/auditLogService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let db: DatabaseAdapter;

beforeEach(async () => {
  db = await openTestDatabase();
  db.exec(`
    CREATE TABLE cases (
      id TEXT PRIMARY KEY,
      case_number TEXT NOT NULL
    );
    CREATE TABLE case_notes (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      title TEXT,
      participants TEXT,
      content TEXT,
      next_steps TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE case_notes_fts USING fts5(
      id UNINDEXED,
      case_id UNINDEXED,
      case_number,
      title,
      participants,
      content,
      next_steps
    );
    CREATE TABLE case_note_cases (
      note_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      PRIMARY KEY (note_id, case_id)
    );
  `);
  ensurePersonalDataAuditSchema(db);
  const service = new ContactService(() => db);
  service.ensureSchema(db);

  db.prepare('INSERT INTO cases (id, case_number) VALUES (?, ?)').run('case-1', 'SBV-1');
  db.prepare(`
    INSERT INTO case_notes (id, case_id, title, participants, content, next_steps, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('note-1', 'case-1', 'Gespräch', 'Erika Muster', 'Erika Muster benötigt Rückmeldung.', null, '2026-08-14T08:00:00.000Z');
  db.prepare(`
    INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('note-1', 'case-1', 'SBV-1', 'Gespräch', 'Erika Muster', 'Erika Muster benötigt Rückmeldung.', '');
  db.prepare(`
    INSERT INTO contacts (id, first_name, last_name, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('contact-1', 'Erika', 'Muster', 'sonstiges', '2026-08-14T08:00:00.000Z', '2026-08-14T08:00:00.000Z');
  db.prepare(`
    INSERT INTO contact_text_references (
      id, contact_id, source_type, source_id, field_name, matched_text, replacement_text, created_at, updated_at
    ) VALUES (?, ?, 'case_note', ?, ?, ?, '[Kontakt anonymisiert]', ?, ?)
  `).run('ref-1', 'contact-1', 'note-1', 'participants', 'Erika Muster', '2026-08-14T08:00:00.000Z', '2026-08-14T08:00:00.000Z');
});

afterEach(() => db.close());

describe('ContactService – atomare Kontaktlöschung', () => {
  it('löscht Kontakt und anonymisiert Referenzen als eine gemeinsame Transaktion', async () => {
    const service = new ContactService(() => db);

    await expect(service.deleteContact('contact-1')).resolves.toEqual({
      deleted: true,
      anonymizedReferences: 1,
      touchedNotes: 1,
    });

    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM contacts WHERE id = ?').get('contact-1')?.count).toBe(0);
    expect(db.prepare<{ participants: string }>('SELECT participants FROM case_notes WHERE id = ?').get('note-1')?.participants).toBe('[Kontakt anonymisiert]');
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM contact_text_references WHERE contact_id = ?').get('contact-1')?.count).toBe(0);
    expect(new PersonalDataAuditLogService(db).listForSubject('contact', 'contact-1').map((entry) => entry.action)).toEqual(['delete']);
  });

  it('rollt bereits erfolgte Anonymisierung vollständig zurück, wenn das Kontakt-DELETE scheitert', async () => {
    db.exec(`
      CREATE TRIGGER fail_contact_delete
      BEFORE DELETE ON contacts
      WHEN OLD.id = 'contact-1'
      BEGIN
        SELECT RAISE(ABORT, 'forced contact delete failure');
      END;
    `);
    const service = new ContactService(() => db);

    await expect(service.deleteContact('contact-1')).rejects.toThrow(/forced contact delete failure/i);

    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM contacts WHERE id = ?').get('contact-1')?.count).toBe(1);
    expect(db.prepare<{ participants: string }>('SELECT participants FROM case_notes WHERE id = ?').get('note-1')?.participants).toBe('Erika Muster');
    expect(db.prepare<{ content: string }>('SELECT content FROM case_notes WHERE id = ?').get('note-1')?.content).toBe('Erika Muster benötigt Rückmeldung.');
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM contact_text_references WHERE contact_id = ?').get('contact-1')?.count).toBe(1);
    expect(db.prepare<{ participants: string }>('SELECT participants FROM case_notes_fts WHERE id = ?').get('note-1')?.participants).toBe('Erika Muster');
    expect(new PersonalDataAuditLogService(db).listForSubject('contact', 'contact-1')).toEqual([]);
  });
});
