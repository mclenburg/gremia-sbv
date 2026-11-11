import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { createVacationV5Manifest } from '../../../../services/vacationV5SectionManifest';
import { importVacationV5Sections } from '../../../../services/vacationV5SectionImporter';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const db = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    all: (...args: unknown[]) => statement.all(...args as []) as T[], get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, db };
}

describe('Format-5-Import übergreifender Vorgänge', () => {
  it('legt lokale Kopien mit aufgelösten TOP- und Fristreferenzen samt Ledger an', () => {
    const { raw, db } = database();
    try {
      const sections = [
        { type: 'meeting', schemaVersion: 1, count: 1, items: [{ ref: 'meeting_1', data: { meeting_type: 'other', title: 'Sitzung', starts_at: '2099-11-20', status: 'draft' } }] },
        { type: 'meeting_agenda', schemaVersion: 1, count: 1, items: [{ ref: 'agenda_1', parentRef: 'meeting_1', data: { position: 1, title: 'TOP', status: 'open', own_position: 'SBV-Position' } }] },
        { type: 'deadline', schemaVersion: 1, count: 1, items: [{ ref: 'deadline_1', parentRef: 'meeting_1', data: { process_type: 'sbv_meeting', deadline_type: 'follow_up', title: 'Nachfassen', due_at: '2099-11-19', status: 'open' } }] },
      ];
      const result = importVacationV5Sections(db, 'handover_v5_import_test', '2099-11-30', sections, createVacationV5Manifest(sections));
      expect(result.importedCount).toBe(3);
      const meeting = raw.prepare('SELECT id, title FROM sbv_meetings').get() as { id: string; title: string };
      expect(meeting.title).toBe('Sitzung');
      expect(raw.prepare('SELECT meeting_id, own_position FROM sbv_meeting_agenda_items').get()).toEqual({ meeting_id: meeting.id, own_position: 'SBV-Position' });
      expect(raw.prepare('SELECT case_id, process_id, process_type FROM deadlines').get()).toEqual({ case_id: null, process_id: meeting.id, process_type: 'sbv_meeting' });
      expect(raw.prepare('SELECT package_ref, local_entity_id FROM case_handover_import_items ORDER BY package_ref').all())
        .toEqual(expect.arrayContaining([expect.objectContaining({ package_ref: 'meeting_1', local_entity_id: meeting.id })]));
      expect(() => importVacationV5Sections(db, 'handover_v5_import_test', '2099-11-30', sections, createVacationV5Manifest(sections))).toThrow(/bereits importiert/);
    } finally { raw.close(); }
  });

  it('rollt den gesamten Import bei einem fachlichen Eindeutigkeitskonflikt zurück', () => {
    const { raw, db } = database();
    try {
      raw.prepare(`INSERT INTO sbv_employer_obligation_reviews (id, obligation_key, period_year, scope_key, status, created_at, updated_at)
        VALUES ('existing', 'quota', 2099, '', 'due', '2026-11-11', '2026-11-11')`).run();
      const sections = [
        { type: 'meeting', schemaVersion: 1, count: 1, items: [{ ref: 'meeting_1', data: { meeting_type: 'other', title: 'Sitzung', starts_at: '2099-11-20', status: 'draft' } }] },
        { type: 'employer_obligation', schemaVersion: 1, count: 1, items: [{ ref: 'obligation_1', data: { obligation_key: 'quota', period_year: 2099, scope_key: '', status: 'due' } }] },
      ];
      expect(() => importVacationV5Sections(db, 'handover_v5_conflict_test', '2099-11-30', sections, createVacationV5Manifest(sections))).toThrow();
      expect(raw.prepare('SELECT COUNT(*) AS count FROM sbv_meetings').get()).toEqual({ count: 0 });
      expect(raw.prepare('SELECT COUNT(*) AS count FROM case_handover_imports').get()).toEqual({ count: 0 });
      expect(raw.prepare('SELECT id FROM sbv_employer_obligation_reviews').all()).toEqual([{ id: 'existing' }]);
    } finally { raw.close(); }
  });
});
