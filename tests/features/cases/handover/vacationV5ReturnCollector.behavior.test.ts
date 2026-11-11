import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { caseHandoverBaselineHash } from '../../../../services/caseHandoverBaselineHash';
import { collectVacationV5ReturnChanges } from '../../../../services/vacationV5ReturnCollector';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, adapter };
}

describe('Format-5-Rückgabebestand', () => {
  it('überträgt nur Änderungen mit Paketbeziehungen und ausdrückliche Stornowünsche', () => {
    const { raw, adapter } = database();
    try {
      raw.exec(`
        INSERT INTO case_handover_imports (id, package_id, imported_at, valid_until, format_version)
          VALUES ('import-1', 'handover_delta', '2026-11-11', '2099-11-30', 5);
        INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
          VALUES ('meeting-a', 'other', 'Sitzung A', '2099-11-20', 'draft', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
          VALUES ('meeting-b', 'other', 'Sitzung B', '2099-11-21', 'draft', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_meeting_agenda_items (id, meeting_id, title, created_at, updated_at)
          VALUES ('agenda-a', 'meeting-a', 'TOP', '2026-11-11', '2026-11-11');
      `);
      for (const [ref, kind, table, id] of [
        ['meeting_1', 'meeting', 'sbv_meetings', 'meeting-a'],
        ['meeting_2', 'meeting', 'sbv_meetings', 'meeting-b'],
        ['agenda_1', 'meeting_agenda', 'sbv_meeting_agenda_items', 'agenda-a'],
      ]) {
        const baseline = caseHandoverBaselineHash(raw.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)!);
        raw.prepare(`INSERT INTO case_handover_import_items
          (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at, baseline_sha256)
          VALUES (?, 'import-1', ?, ?, ?, '2026-11-11', ?)`).run(`item-${ref}`, kind, id, ref, baseline);
      }
      expect(collectVacationV5ReturnChanges(adapter, 'handover_delta', '').changes).toEqual([]);
      raw.prepare("UPDATE sbv_meetings SET title = 'Neue Sitzung' WHERE id = 'meeting-a'").run();
      raw.prepare("UPDATE sbv_meeting_agenda_items SET title = 'Neuer TOP' WHERE id = 'agenda-a'").run();
      raw.prepare("DELETE FROM sbv_meetings WHERE id = 'meeting-b'").run();
      const changes = collectVacationV5ReturnChanges(adapter, 'handover_delta', '',
        [{ ref: 'meeting_2', reason: 'Termin entfällt' }]).changes;
      expect(changes.map((item) => [item.ref, item.operation])).toEqual([
        ['agenda_1', 'upsert'], ['meeting_1', 'upsert'], ['meeting_2', 'cancel_request'],
      ]);
      expect(changes[0].links).toEqual({ meetingRef: 'meeting_1' });
      expect(changes[0].data).not.toHaveProperty('id');
      expect(changes[2]).toMatchObject({ reason: 'Termin entfällt' });
      expect(() => collectVacationV5ReturnChanges(adapter, 'handover_delta', '')).toThrow(/Stornowunsch/);
      expect(() => collectVacationV5ReturnChanges(adapter, 'handover_delta', '',
        [{ ref: 'unknown_1', reason: 'Unbekannt' }])).toThrow();
    } finally { raw.close(); }
  });
});
