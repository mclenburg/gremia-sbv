import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { PersonCaseLinkService } from '../services/personCaseLinkService';

type Row = { id: string; protected_person_id: string; case_file_id: string; link_state: string; created_at: string; anonymized_at: string | null; link_reason: string | null };
class LinkDb implements DatabaseAdapter {
  rows: Row[] = [];
  prepare<T = unknown>(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      get: (...params: unknown[]): T | undefined => {
        if (normalized.includes('WHERE protected_person_id = ? AND case_file_id = ?')) return this.rows.find((r) => r.protected_person_id === params[0] && r.case_file_id === params[1]) as T | undefined;
        return undefined;
      },
      all: (...params: unknown[]): T[] => {
        let rows = this.rows.filter((r) => r.protected_person_id === params[0]);
        if (normalized.includes('AND link_state = ?')) rows = rows.filter((r) => r.link_state === params[1]);
        return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)) as T[];
      },
      run: (...params: unknown[]) => {
        if (normalized.startsWith('INSERT INTO person_case_links')) {
          this.rows.push({ id: String(params[0]), protected_person_id: String(params[1]), case_file_id: String(params[2]), link_state: 'active', created_at: String(params[3]), link_reason: params[4] === null ? null : String(params[4]), anonymized_at: null });
          return { changes: 1 };
        }
        if (normalized.startsWith('UPDATE person_case_links SET link_state')) {
          let changes = 0;
          for (const row of this.rows) if (row.protected_person_id === params[1] && row.link_state === 'active') { row.link_state = 'person_anonymized'; row.anonymized_at = String(params[0]); changes++; }
          return { changes };
        }
        return { changes: 0 };
      },
    };
  }
  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

describe('Person-Fall-Verknüpfung – Verhalten', () => {
  it('legt eine aktive Verknüpfung mit normalisiertem Grund an und liefert sie wieder', () => {
    const db = new LinkDb();
    const service = new PersonCaseLinkService(db);
    const link = service.linkCase('person-1', 'case-1', '  Beratung  ');
    expect(link).toMatchObject({ protectedPersonId: 'person-1', caseFileId: 'case-1', linkState: 'active', linkReason: 'Beratung' });
    expect(service.listCaseLinks('person-1')).toHaveLength(1);
  });

  it('ist idempotent und erzeugt bei wiederholter Zuordnung keinen Duplikatdatensatz', () => {
    const db = new LinkDb();
    const service = new PersonCaseLinkService(db);
    const first = service.linkCase('person-1', 'case-1');
    const second = service.linkCase('person-1', 'case-1', 'anderer Grund');
    expect(second.id).toBe(first.id);
    expect(db.rows).toHaveLength(1);
  });

  it('anonymisiert nur aktive Links und gibt den vorherigen Zustand zurück', () => {
    const db = new LinkDb();
    db.rows.push(
      { id: 'a', protected_person_id: 'p', case_file_id: 'c1', link_state: 'active', created_at: '2026-01-01', anonymized_at: null, link_reason: null },
      { id: 'b', protected_person_id: 'p', case_file_id: 'c2', link_state: 'removed', created_at: '2026-01-02', anonymized_at: null, link_reason: null },
    );
    const service = new PersonCaseLinkService(db);
    const affected = service.markPersonAnonymized('p', '2026-08-05T00:00:00.000Z');
    expect(affected.map((link) => link.id)).toEqual(['a']);
    expect(db.rows.find((r) => r.id === 'a')).toMatchObject({ link_state: 'person_anonymized', anonymized_at: '2026-08-05T00:00:00.000Z' });
    expect(db.rows.find((r) => r.id === 'b')?.link_state).toBe('removed');
  });
});
