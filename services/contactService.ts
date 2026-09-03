import { randomUUID } from 'node:crypto';
import type { ContactCategory, ContactListFilters, ContactRecord, CreateContactInput, UpdateContactInput } from '../src/domain/models/contact.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { anonymizeContactReferences, ensureContactPrivacySchema } from './contactPrivacyService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { ensureContactsRuntimeSchema } from './runtimeSchemaCompatibility.js';


interface ContactDatabaseRow {
  id: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  role: string | null;
  category: ContactCategory;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactIdRow { id: string; }

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapContact(row: ContactDatabaseRow): ContactRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    organization: row.organization ?? undefined,
    role: row.role ?? undefined,
    category: row.category as ContactCategory,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function requireContactRow(row: ContactDatabaseRow | undefined, id: string): ContactDatabaseRow {
  if (!row) throw new Error(`Kontakt konnte nach dem Speichern nicht geladen werden: ${id}`);
  return row;
}

function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export class ContactService {
  constructor(private readonly database: DatabaseAdapter) {}

  private audit(db: DatabaseAdapter, input: Parameters<PersonalDataAuditLogService['append']>[0]): void {
    try {
      new PersonalDataAuditLogService(db).append(input);
    } catch (error) {
      console.warn('Gremia.SBV audit log write failed', error instanceof Error ? error.name : 'UnknownError');
    }
  }

  ensureSchema(db = this.database): void {
    ensureContactPrivacySchema(db);
    ensureContactsRuntimeSchema(db);
  }

  private getSafeDb(): DatabaseAdapter {
    const db = this.database;
    return db;
  }

  async listContacts(filters: ContactListFilters = {}): Promise<ContactRecord[]> {
    const db = this.getSafeDb();
    this.audit(db, { action: 'read', subjectType: 'contact', purpose: 'Kontaktliste anzeigen', metadata: { hasQuery: Boolean(filters.query), category: filters.category ?? null } });
    const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
    const query = filters.query?.trim();

    if (query) {
      const pattern = likePattern(query);
      const rows = db.prepare<ContactDatabaseRow>(`
        SELECT * FROM contacts
        WHERE (? IS NULL OR category = ?)
          AND (
            first_name LIKE ? ESCAPE '\\'
            OR last_name LIKE ? ESCAPE '\\'
            OR COALESCE(organization, '') LIKE ? ESCAPE '\\'
            OR COALESCE(role, '') LIKE ? ESCAPE '\\'
            OR COALESCE(email, '') LIKE ? ESCAPE '\\'
            OR COALESCE(phone, '') LIKE ? ESCAPE '\\'
            OR COALESCE(notes, '') LIKE ? ESCAPE '\\'
          )
        ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE, organization COLLATE NOCASE
        LIMIT ?
      `).all(filters.category ?? null, filters.category ?? null, pattern, pattern, pattern, pattern, pattern, pattern, pattern, limit);
      return rows.map(mapContact);
    }

    const rows = db.prepare<ContactDatabaseRow>(`
      SELECT * FROM contacts
      WHERE (? IS NULL OR category = ?)
      ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE, organization COLLATE NOCASE
      LIMIT ?
    `).all(filters.category ?? null, filters.category ?? null, limit);
    return rows.map(mapContact);
  }

  async createContact(input: CreateContactInput): Promise<ContactRecord> {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName) throw new Error('Bitte einen Vornamen erfassen.');
    if (!lastName) throw new Error('Bitte einen Nachnamen erfassen.');

    const db = this.getSafeDb();
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO contacts (
        id, first_name, last_name, organization, role, category, email, phone, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      firstName,
      lastName,
      normalizeOptional(input.organization),
      normalizeOptional(input.role),
      input.category ?? 'sonstiges',
      normalizeOptional(input.email),
      normalizeOptional(input.phone),
      normalizeOptional(input.notes),
      timestamp,
      timestamp
    );

    const created = db.prepare<ContactDatabaseRow>('SELECT * FROM contacts WHERE id = ?').get(id);
    this.audit(db, { action: 'create', subjectType: 'contact', subjectId: id, purpose: 'Kontakt angelegt', metadata: { category: input.category ?? 'sonstiges' } });
    return mapContact(requireContactRow(created, id));
  }

  async updateContact(id: string, input: UpdateContactInput): Promise<ContactRecord> {
    const db = this.getSafeDb();
    const before = db.prepare<ContactDatabaseRow>('SELECT * FROM contacts WHERE id = ?').get(id);
    if (!before) throw new Error(`Kontakt nicht gefunden: ${id}`);

    const firstName = input.firstName === undefined ? before.first_name : input.firstName.trim();
    const lastName = input.lastName === undefined ? before.last_name : input.lastName.trim();
    if (!firstName) throw new Error('Bitte einen Vornamen erfassen.');
    if (!lastName) throw new Error('Bitte einen Nachnamen erfassen.');

    db.prepare(`
      UPDATE contacts SET
        first_name = ?, last_name = ?, organization = ?, role = ?, category = ?, email = ?, phone = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      firstName,
      lastName,
      input.organization === undefined ? before.organization : normalizeOptional(input.organization),
      input.role === undefined ? before.role : normalizeOptional(input.role),
      input.category ?? before.category,
      input.email === undefined ? before.email : normalizeOptional(input.email),
      input.phone === undefined ? before.phone : normalizeOptional(input.phone),
      input.notes === undefined ? before.notes : normalizeOptional(input.notes),
      nowIso(),
      id
    );

    const updated = db.prepare<ContactDatabaseRow>('SELECT * FROM contacts WHERE id = ?').get(id);
    this.audit(db, { action: 'update', subjectType: 'contact', subjectId: id, purpose: 'Kontakt geändert' });
    return mapContact(requireContactRow(updated, id));
  }

  async deleteContact(id: string): Promise<{ deleted: boolean; anonymizedReferences: number; touchedNotes: number }> {
    const db = this.getSafeDb();
    const before = db.prepare<ContactIdRow>('SELECT id FROM contacts WHERE id = ?').get(id);
    if (!before) return { deleted: false, anonymizedReferences: 0, touchedNotes: 0 };

    const outcome = new DatabaseUnitOfWork(db).run(() => {
      const privacyResult = anonymizeContactReferences(db, id);
      const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(id) as { changes?: number } | undefined;
      if (result?.changes !== 1) {
        throw new Error(`Kontakt konnte nicht gelöscht werden: ${id}`);
      }
      return privacyResult;
    });

    this.audit(db, { action: 'delete', subjectType: 'contact', subjectId: id, purpose: 'Kontakt gelöscht und Referenzen anonymisiert', metadata: outcome });
    return { deleted: true, ...outcome };
  }
}
