import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService.js';
import { getSchemaMigrationHook } from '../../../../services/schemaMigrationHooks.js';
import { UnifiedSearchIndexService } from '../../../../services/search/unifiedSearchIndexService.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3-multiple-ciphers') as new (path: string) => DatabaseAdapter;
const snapshot = readFileSync(new URL('../../../../database/schema.sql', import.meta.url), 'utf8');

function open(): DatabaseAdapter {
  const db = new Database(':memory:');
  db.exec(snapshot);
  getSchemaMigrationHook('0067')?.apply(db);
  return db;
}

function insertCase(db: DatabaseAdapter, id: string, number: string, name: string): void {
  db.prepare(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
    VALUES (?, ?, ?, 'beratung', '2026-01-01', '2026-01-01', '2026-01-01')`).run(id, number, name);
}

function insertContact(db: DatabaseAdapter, id: string, firstName: string, lastName: string, updatedAt = '2026-01-01'): void {
  db.prepare(`INSERT INTO contacts (id, first_name, last_name, category, created_at, updated_at)
    VALUES (?, ?, ?, 'sonstiges', '2026-01-01', ?)`).run(id, firstName, lastName, updatedAt);
}

describe('unified search index', () => {
  it('separates current case, all cases and the full professional data set', () => {
    const db = open();
    try {
      insertCase(db, 'case-a', 'A-1', 'Einzigartige Fallakte Alpha');
      insertCase(db, 'case-b', 'B-1', 'Einzigartige Fallakte Beta');
      insertContact(db, 'contact-1', 'Else', 'Globalkontakt');
      const search = new UnifiedSearchIndexService(db);
      expect(search.search({ query: 'Alpha', area: 'current_case', currentCaseId: 'case-a' }).total).toBe(1);
      const caseRowId = db.prepare<{ rowid: number }>("SELECT rowid FROM search_entries WHERE source_type = 'case' AND source_id = 'case-a'").get()?.rowid;
      expect(search.search({ query: 'Alpha', area: 'current_case', currentCaseId: 'case-b' }).total).toBe(0);
      expect(search.search({ query: 'Alpha', area: 'all_cases' }).total).toBe(1);
      expect(search.search({ query: 'Globalkontakt', area: 'all_cases' }).total).toBe(0);
      const global = search.search({ query: 'Globalkontakt', area: 'all_data' });
      expect(global.total).toBe(1);
      expect(global.hits[0]).toMatchObject({ sourceType: 'contact', module: 'Kontakte', navigationId: 'contact-1' });
      db.prepare("UPDATE contacts SET notes = 'Zusatztext' WHERE id = 'contact-1'").run();
      expect(search.search({ query: 'Zusatztext', area: 'all_data' }).total).toBe(1);
      expect(db.prepare("SELECT rowid FROM search_entries WHERE source_type = 'case' AND source_id = 'case-a'").get()).toEqual({ rowid: caseRowId });
    } finally {
      db.close();
    }
  });

  it('notices older-row edits and deletion without relying on MAX(updated_at)', () => {
    const db = open();
    try {
      insertContact(db, 'old', 'Alter', 'Eintrag', '2026-01-01');
      insertContact(db, 'new', 'Neuer', 'Eintrag', '2026-09-01');
      const search = new UnifiedSearchIndexService(db);
      expect(search.search({ query: 'SeltenesWort', area: 'all_data' }).total).toBe(0);
      db.prepare("UPDATE contacts SET notes = 'SeltenesWort', updated_at = '2026-02-01' WHERE id = 'old'").run();
      expect(search.search({ query: 'SeltenesWort', area: 'all_data' }).total).toBe(1);
      db.prepare("DELETE FROM contacts WHERE id = 'old'").run();
      expect(search.search({ query: 'SeltenesWort', area: 'all_data' }).total).toBe(0);
      expect(db.prepare("SELECT COUNT(*) AS count FROM search_entries_fts WHERE search_entries_fts MATCH 'SeltenesWort'").get()).toEqual({ count: 0 });
    } finally {
      db.close();
    }
  });

  it('updates case membership when a contact is linked or unlinked', () => {
    const db = open();
    try {
      insertCase(db, 'case-a', 'A-1', 'Fall A');
      insertCase(db, 'case-b', 'B-1', 'Fall B');
      insertContact(db, 'contact-1', 'Mira', 'Fallkontakt');
      const search = new UnifiedSearchIndexService(db);
      expect(search.search({ query: 'Fallkontakt', area: 'all_cases' }).total).toBe(0);
      db.prepare("INSERT INTO case_contacts(case_id, contact_id) VALUES ('case-a', 'contact-1')").run();
      expect(search.search({ query: 'Fallkontakt', area: 'current_case', currentCaseId: 'case-a' }).total).toBe(1);
      expect(search.search({ query: 'Fallkontakt', area: 'current_case', currentCaseId: 'case-b' }).total).toBe(0);
      db.prepare("DELETE FROM case_contacts WHERE case_id = 'case-a' AND contact_id = 'contact-1'").run();
      expect(search.search({ query: 'Fallkontakt', area: 'all_cases' }).total).toBe(0);
      expect(search.search({ query: 'Fallkontakt', area: 'all_data' }).total).toBe(1);
    } finally {
      db.close();
    }
  });

  it('reports the real hit count and pages beyond the old 80-result limit', () => {
    const db = open();
    try {
      for (let index = 0; index < 103; index += 1) insertContact(db, `contact-${index}`, 'Suchwort', `Name ${index}`);
      const search = new UnifiedSearchIndexService(db);
      const first = search.search({ query: 'Suchwort', area: 'all_data', limit: 80 });
      const last = search.search({ query: 'Suchwort', area: 'all_data', offset: 80, limit: 80 });
      expect(first.total).toBe(103);
      expect(first.hits).toHaveLength(80);
      expect(last.total).toBe(103);
      expect(last.hits).toHaveLength(23);
    } finally {
      db.close();
    }
  });

  it('indexes approved child text with its parent and refreshes it after a child edit', () => {
    const db = open();
    try {
      db.prepare(`INSERT INTO legal_norms(id, source, paragraph, title, short_text, created_at, updated_at)
        VALUES ('norm-1', 'SGB IX', '178', 'Beteiligung', 'Kurzer Text', '2026-01-01', '2026-01-01')`).run();
      db.prepare(`INSERT INTO norm_comments(id, legal_norm_id, title, content, created_at, updated_at)
        VALUES ('comment-1', 'norm-1', 'Hinweis', 'EinmaligesStichwort', '2026-01-01', '2026-01-01')`).run();
      const search = new UnifiedSearchIndexService(db);
      expect(search.search({ query: 'EinmaligesStichwort', area: 'all_data' }).hits[0]).toMatchObject({ sourceType: 'legal_norm', sourceId: 'norm-1' });
      db.prepare("UPDATE norm_comments SET content = 'NeuesStichwort' WHERE id = 'comment-1'").run();
      expect(search.search({ query: 'EinmaligesStichwort', area: 'all_data' }).total).toBe(0);
      expect(search.search({ query: 'NeuesStichwort', area: 'all_data' }).total).toBe(1);
    } finally {
      db.close();
    }
  });

  it('makes a cited norm searchable from the linked case without duplicating its global record', () => {
    const db = open();
    try {
      insertCase(db, 'case-a', 'A-1', 'Fall A');
      db.prepare(`INSERT INTO legal_norms(id, source, paragraph, title, short_text, created_at, updated_at)
        VALUES ('norm-1', 'SGB IX', '178', 'Beteiligung', 'Spezialnormwort', '2026-01-01', '2026-01-01')`).run();
      db.prepare("INSERT INTO case_legal_references(id, case_id, legal_norm_id, note, created_at) VALUES ('ref-1', 'case-a', 'norm-1', 'Zitiert', '2026-01-01')").run();
      const search = new UnifiedSearchIndexService(db);
      expect(search.search({ query: 'Spezialnormwort', area: 'current_case', currentCaseId: 'case-a' }).hits[0])
        .toMatchObject({ sourceType: 'case_legal_reference', sourceId: 'ref-1' });
      expect(search.search({ query: 'Spezialnormwort', area: 'all_data' }).total).toBe(2);
      db.prepare("UPDATE legal_norms SET short_text = 'AnderesNormwort' WHERE id = 'norm-1'").run();
      expect(search.search({ query: 'Spezialnormwort', area: 'current_case', currentCaseId: 'case-a' }).total).toBe(0);
      expect(search.search({ query: 'AnderesNormwort', area: 'current_case', currentCaseId: 'case-a' }).total).toBe(1);
    } finally {
      db.close();
    }
  });
});
