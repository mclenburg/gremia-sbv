import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { collectVacationV5CaseSections } from '../../../../services/vacationV5CaseCollector';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  raw.exec(`
    INSERT INTO protected_persons (id, first_name, last_name, protection_status, created_at, updated_at)
      VALUES ('person-local', 'Alex', 'Beispiel', 'unclear', '2026-11-11', '2026-11-11');
    INSERT INTO cases (id, case_number, display_name, category, status, opened_at, protected_person_id, created_at, updated_at)
      VALUES ('case-local', 'SBV-1', 'Anfrage', 'sonstiges', 'offen', '2026-11-11', 'person-local', '2026-11-11', '2026-11-11');
    INSERT INTO case_measures (id, case_id, type, title, status, opened_at, created_at, updated_at)
      VALUES ('measure-local', 'case-local', 'bem', 'Maßnahme', 'open', '2026-11-11', '2026-11-11', '2026-11-11');
    INSERT INTO case_notes (id, case_id, title, note_date, note_type, content, created_at, updated_at)
      VALUES ('note-local', 'case-local', 'Notiz', '2026-11-11', 'sonstiges', 'Rückruf', '2026-11-11', '2026-11-11');
    INSERT INTO case_measure_notes (id, case_id, measure_type, measure_id, title, note_at, content, created_at, updated_at)
      VALUES ('measure-note-local', 'case-local', 'bem', 'measure-local', 'Maßnahmennotiz', '2026-11-11', 'Nächster Schritt', '2026-11-11', '2026-11-11');
    INSERT INTO deadlines (id, case_id, measure_id, process_type, title, due_at, status, created_at, updated_at)
      VALUES ('deadline-local', 'case-local', 'measure-local', 'case', 'Rückmeldung', '2099-11-20', 'open', '2026-11-11', '2026-11-11');
  `);
  return { raw, adapter };
}

describe('Format-5-Collector für Fallakten', () => {
  it('übernimmt notwendige Beziehungen als Paket-Referenzen ohne lokale IDs', () => {
    const { raw, adapter } = database();
    try {
      const result = collectVacationV5CaseSections(adapter, { caseIds: ['case-local'] });
      expect(result.sections.map((section) => [section.type, section.count])).toEqual([
        ['protected_person', 1], ['case', 1], ['case_measure', 1], ['case_note', 1], ['case_measure_note', 1], ['case_deadline', 1],
      ]);
      expect(result.sections.find((section) => section.type === 'case')?.items[0].links).toEqual({ protectedPersonRef: 'person_1' });
      expect(result.sections.find((section) => section.type === 'case_deadline')?.items[0].links)
        .toEqual({ caseRef: 'case_1', measureRef: 'measure_1' });
      expect(JSON.stringify(result.sections)).not.toContain('case-local');
      expect(JSON.stringify(result.sections)).not.toContain('person-local');
      expect(result.sourceByRef.case_1).toMatchObject({ kind: 'case', localId: 'case-local' });
      expect(result.sourceByRef.case_1.baselineSha256).toMatch(/^[0-9a-f]{64}$/);
    } finally { raw.close(); }
  });

  it('sperrt eine Fallfrist mit einem nicht modellierten Vorgangsbezug', () => {
    const { raw, adapter } = database();
    try {
      raw.prepare("UPDATE deadlines SET process_id = 'external-local' WHERE id = 'deadline-local'").run();
      expect(() => collectVacationV5CaseSections(adapter, { caseIds: ['case-local'] })).toThrow(/nicht aufgelösten/);
    } finally { raw.close(); }
  });
});
