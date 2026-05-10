import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { PersonCaseLinkRecord } from '../src/app/core/models/protected-person.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptional(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function mapLink(row: any): PersonCaseLinkRecord {
  return {
    id: row.id,
    protectedPersonId: row.protected_person_id,
    caseFileId: row.case_file_id,
    linkState: row.link_state ?? 'active',
    createdAt: row.created_at,
    anonymizedAt: row.anonymized_at ?? undefined,
    linkReason: row.link_reason ?? undefined
  };
}

export class PersonCaseLinkService {
  constructor(private readonly db: DatabaseAdapter) {}

  linkCase(protectedPersonId: string, caseFileId: string, linkReason?: string): PersonCaseLinkRecord {
    const existing = this.db.prepare<any>('SELECT * FROM person_case_links WHERE protected_person_id = ? AND case_file_id = ?').get(protectedPersonId, caseFileId);
    if (existing) return mapLink(existing);
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO person_case_links (id, protected_person_id, case_file_id, link_state, created_at, link_reason)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).run(id, protectedPersonId, caseFileId, nowIso(), normalizeOptional(linkReason));
    return this.listCaseLinks(protectedPersonId).find((link) => link.id === id)!;
  }

  listCaseLinks(protectedPersonId: string): PersonCaseLinkRecord[] {
    return this.db.prepare<any>('SELECT * FROM person_case_links WHERE protected_person_id = ? ORDER BY created_at DESC').all(protectedPersonId).map(mapLink);
  }

  markPersonAnonymized(protectedPersonId: string, anonymizedAt = nowIso()): PersonCaseLinkRecord[] {
    const activeLinks = this.db.prepare<any>('SELECT * FROM person_case_links WHERE protected_person_id = ? AND link_state = ?').all(protectedPersonId, 'active').map(mapLink);
    this.db.prepare(`UPDATE person_case_links SET link_state = 'person_anonymized', anonymized_at = ? WHERE protected_person_id = ? AND link_state = 'active'`).run(anonymizedAt, protectedPersonId);
    return activeLinks;
  }
}
