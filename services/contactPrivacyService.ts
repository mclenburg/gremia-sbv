import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';

const CONTACT_PLACEHOLDER = '[Kontakt anonymisiert]';

const NOTE_FIELD_TO_COLUMN: Record<string, string> = {
  title: 'title',
  participants: 'participants',
  content: 'content',
  next_steps: 'next_steps'
};

type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  organization?: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalizeWhitespace).filter((value) => value.length >= 3))];
}

function contactDisplayName(contact: ContactRow): string {
  const name = [contact.last_name, contact.first_name].map((part) => part?.trim()).filter(Boolean).join(', ');
  const organization = contact.organization?.trim();
  return organization ? `${name} (${organization})` : name;
}

function contactMatchVariants(
  contact: ContactRow,
  options: { allowSalutationLastName?: boolean; allowInitialLastName?: boolean } = {}
): string[] {
  const first = contact.first_name.trim();
  const last = contact.last_name.trim();
  const org = contact.organization?.trim();
  const initial = first ? first.charAt(0) : '';

  return unique([
    contactDisplayName(contact),
    `${last}, ${first}`,
    `${first} ${last}`,
    `${last} ${first}`,
    org ? `${first} ${last} (${org})` : '',
    org ? `${last} ${first} (${org})` : '',
    options.allowInitialLastName && initial ? `${initial}. ${last}` : '',
    options.allowSalutationLastName ? `Herr ${last}` : '',
    options.allowSalutationLastName ? `Frau ${last}` : ''
  ]);
}

function findContactMatches(
  text: string | null | undefined,
  contact: ContactRow,
  options: { allowSalutationLastName?: boolean; allowInitialLastName?: boolean } = {}
): string[] {
  if (!text) return [];
  const matches: string[] = [];

  for (const variant of contactMatchVariants(contact, options)) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegex(variant)})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
    for (const match of text.matchAll(pattern)) {
      if (match[2]) matches.push(match[2]);
    }
  }

  return unique(matches);
}

function replaceAllExact(value: string | null | undefined, terms: string[], replacement: string): string | null {
  if (value === null || value === undefined) return value ?? null;
  let next = value;
  const ordered = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const term of ordered) {
    next = next.split(term).join(replacement);
  }
  return next;
}

function contactTableExists(db: DatabaseAdapter): boolean {
  const row = db.prepare<any>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'contacts'").get();
  return Boolean(row);
}

export function ensureContactPrivacySchema(db: DatabaseAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      organization TEXT,
      role TEXT,
      category TEXT NOT NULL DEFAULT 'sonstiges',
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_text_references (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      matched_text TEXT NOT NULL,
      replacement_text TEXT NOT NULL DEFAULT '[Kontakt anonymisiert]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      anonymized_at TEXT,
      UNIQUE(contact_id, source_type, source_id, field_name, matched_text),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_text_refs_contact ON contact_text_references(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_text_refs_source ON contact_text_references(source_type, source_id);
  `);
}

function reindexNote(db: DatabaseAdapter, noteId: string): void {
  const row = db.prepare<any>(`
    SELECT n.*, c.case_number,
      (SELECT GROUP_CONCAT(DISTINCT lc.case_number) FROM case_note_cases cnc JOIN cases lc ON lc.id = cnc.case_id WHERE cnc.note_id = n.id) AS case_numbers
    FROM case_notes n
    JOIN cases c ON c.id = n.case_id
    WHERE n.id = ?
  `).get(noteId);
  if (!row) return;

  db.prepare('DELETE FROM case_notes_fts WHERE id = ?').run(noteId);
  db.prepare(`
    INSERT INTO case_notes_fts (id, case_id, case_number, title, participants, content, next_steps)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.id,
    row.case_id,
    row.case_number,
    `${row.title ?? 'Gesprächsnotiz'} ${row.case_numbers ?? ''}`,
    row.participants ?? '',
    row.content ?? '',
    row.next_steps ?? ''
  );
}

export function scanCaseNoteContactReferences(db: DatabaseAdapter, noteId: string): { linkedReferences: number; linkedContacts: number } {
  ensureContactPrivacySchema(db);
  if (!contactTableExists(db)) return { linkedReferences: 0, linkedContacts: 0 };

  const note = db.prepare<any>('SELECT id, title, participants, content, next_steps FROM case_notes WHERE id = ?').get(noteId);
  if (!note) return { linkedReferences: 0, linkedContacts: 0 };

  db.prepare("DELETE FROM contact_text_references WHERE source_type = 'case_note' AND source_id = ?").run(noteId);

  const contacts = db.prepare<ContactRow>('SELECT id, first_name, last_name, organization FROM contacts ORDER BY length(last_name) DESC, length(first_name) DESC').all();
  const normalizedLastNameCounts = new Map<string, number>();
  const normalizedInitialLastNameCounts = new Map<string, number>();

  for (const contact of contacts) {
    const lastKey = contact.last_name.trim().toLocaleLowerCase('de-DE');
    const initial = contact.first_name.trim().charAt(0).toLocaleLowerCase('de-DE');
    const initialLastKey = `${initial}.${lastKey}`;
    normalizedLastNameCounts.set(lastKey, (normalizedLastNameCounts.get(lastKey) ?? 0) + 1);
    normalizedInitialLastNameCounts.set(initialLastKey, (normalizedInitialLastNameCounts.get(initialLastKey) ?? 0) + 1);
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO contact_text_references (
      id, contact_id, source_type, source_id, field_name, matched_text, replacement_text, created_at, updated_at
    ) VALUES (?, ?, 'case_note', ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = nowIso();
  let linkedReferences = 0;
  const linkedContactIds = new Set<string>();
  const fields: Array<{ name: string; value: string | null | undefined }> = [
    { name: 'title', value: note.title },
    { name: 'participants', value: note.participants },
    { name: 'content', value: note.content },
    { name: 'next_steps', value: note.next_steps }
  ];

  for (const contact of contacts) {
    for (const field of fields) {
      const lastKey = contact.last_name.trim().toLocaleLowerCase('de-DE');
      const initial = contact.first_name.trim().charAt(0).toLocaleLowerCase('de-DE');
      const matches = findContactMatches(field.value, contact, {
        allowInitialLastName: (normalizedInitialLastNameCounts.get(`${initial}.${lastKey}`) ?? 0) === 1,
        allowSalutationLastName: (normalizedLastNameCounts.get(lastKey) ?? 0) === 1
      });
      for (const match of matches) {
        const result = insert.run(randomUUID(), contact.id, noteId, field.name, match, CONTACT_PLACEHOLDER, timestamp, timestamp) as { changes?: number } | undefined;
        if (result?.changes) {
          linkedReferences += 1;
          linkedContactIds.add(contact.id);
        }
      }
    }
  }

  return { linkedReferences, linkedContacts: linkedContactIds.size };
}

export function anonymizeContactReferences(db: DatabaseAdapter, contactId: string): { anonymizedReferences: number; touchedNotes: number } {
  ensureContactPrivacySchema(db);

  const refs = db.prepare<any>(`
    SELECT source_type, source_id, field_name, matched_text, replacement_text
    FROM contact_text_references
    WHERE contact_id = ? AND anonymized_at IS NULL
    ORDER BY length(matched_text) DESC
  `).all(contactId);

  const noteUpdates = new Map<string, Map<string, string[]>>();
  for (const ref of refs) {
    if (ref.source_type !== 'case_note') continue;
    if (!NOTE_FIELD_TO_COLUMN[ref.field_name]) continue;
    if (!noteUpdates.has(ref.source_id)) noteUpdates.set(ref.source_id, new Map());
    const fields = noteUpdates.get(ref.source_id)!;
    const list = fields.get(ref.field_name) ?? [];
    list.push(ref.matched_text);
    fields.set(ref.field_name, list);
  }

  const timestamp = nowIso();
  let anonymizedReferences = 0;
  const touchedNotes = new Set<string>();

  for (const [noteId, fields] of noteUpdates.entries()) {
    const note = db.prepare<any>('SELECT id, title, participants, content, next_steps FROM case_notes WHERE id = ?').get(noteId);
    if (!note) continue;

    const nextValues: Record<string, string | null> = {};
    let changed = false;

    for (const [fieldName, terms] of fields.entries()) {
      const column = NOTE_FIELD_TO_COLUMN[fieldName];
      const current = note[column];
      const next = replaceAllExact(current, terms, CONTACT_PLACEHOLDER);
      nextValues[column] = next;
      if (next !== current) changed = true;
    }

    if (!changed) continue;

    db.prepare(`
      UPDATE case_notes SET
        title = COALESCE(?, title),
        participants = ?,
        content = COALESCE(?, content),
        next_steps = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      nextValues.title ?? note.title,
      Object.prototype.hasOwnProperty.call(nextValues, 'participants') ? nextValues.participants : note.participants,
      nextValues.content ?? note.content,
      Object.prototype.hasOwnProperty.call(nextValues, 'next_steps') ? nextValues.next_steps : note.next_steps,
      timestamp,
      noteId
    );
    reindexNote(db, noteId);
    touchedNotes.add(noteId);
  }

  const result = db.prepare("UPDATE contact_text_references SET anonymized_at = ?, updated_at = ? WHERE contact_id = ? AND anonymized_at IS NULL").run(timestamp, timestamp, contactId) as { changes?: number } | undefined;
  anonymizedReferences = result?.changes ?? 0;
  db.prepare('DELETE FROM contact_text_references WHERE contact_id = ?').run(contactId);

  return { anonymizedReferences, touchedNotes: touchedNotes.size };
}
