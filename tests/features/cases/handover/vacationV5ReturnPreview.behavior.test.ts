import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { caseHandoverBaselineHash } from '../../../../services/caseHandoverBaselineHash';
import { previewVacationV5Return, previewVacationV5ReturnPayload } from '../../../../services/vacationV5ReturnPreview';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, adapter };
}

describe('Format-5-Rückgabevorschau', () => {
  it('bindet Rückgaben an die ursprüngliche Zielinstanz und prüft den aktuellen Quellstand', () => {
    const { raw, adapter } = database();
    const fingerprint = 'a'.repeat(64);
    const deputyBaseline = 'b'.repeat(64);
    const deputyCurrent = 'c'.repeat(64);
    try {
      raw.prepare(`INSERT INTO case_handover_exports
        (id, package_id, exported_at, package_type, format_version, target_key_fingerprint)
        VALUES ('export-1', 'handover_preview', '2026-11-11', 'vacation_handover', 5, ?)`).run(fingerprint);
      raw.exec(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('meeting-origin', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`);
      const baseline = caseHandoverBaselineHash(raw.prepare('SELECT * FROM sbv_meetings').get()!);
      raw.prepare(`INSERT INTO case_handover_export_items
        (id, handover_export_id, package_ref, local_entity_type, local_entity_id, exported_at, baseline_sha256)
        VALUES ('item-1', 'export-1', 'meeting_1', 'meeting', 'meeting-origin', '2026-11-11', ?)`).run(baseline);
      const item = { ref: 'meeting_1', kind: 'meeting', status: 'changed' as const,
        baselineSha256: deputyBaseline, currentSha256: deputyCurrent };
      expect(previewVacationV5Return(adapter, 'handover_preview', fingerprint, [item], '').items)
        .toEqual([{ ref: 'meeting_1', kind: 'meeting', decision: 'propose_update' }]);
      expect(previewVacationV5ReturnPayload(adapter, { sourcePackageId: 'handover_preview',
        origin: { keyFingerprint: fingerprint }, changes: [{ ref: 'meeting_1', kind: 'meeting', operation: 'upsert',
          deputyBaselineSha256: deputyBaseline, deputyCurrentSha256: deputyCurrent,
          data: { meeting_type: 'other', title: 'Geändert', starts_at: '2099-11-20', status: 'draft' } }] }, '').items)
        .toEqual([{ ref: 'meeting_1', kind: 'meeting', decision: 'propose_update' }]);
      expect(previewVacationV5ReturnPayload(adapter, { sourcePackageId: 'handover_preview',
        origin: { keyFingerprint: fingerprint }, changes: [{ ref: 'meeting_1', kind: 'meeting', operation: 'cancel_request',
          deputyBaselineSha256: deputyBaseline, deputyCurrentSha256: null, reason: 'Termin entfällt' }] }, '').items)
        .toEqual([{ ref: 'meeting_1', kind: 'meeting', decision: 'review_removal' }]);
      raw.prepare("UPDATE sbv_meetings SET title = 'Parallel geändert' WHERE id = 'meeting-origin'").run();
      expect(previewVacationV5Return(adapter, 'handover_preview', fingerprint, [item], '').items[0].decision)
        .toBe('review_conflict');
      expect(() => previewVacationV5Return(adapter, 'handover_preview', 'd'.repeat(64), [item], '')).toThrow();
      expect(() => previewVacationV5Return(adapter, 'unknown', fingerprint, [item], '')).toThrow();
    } finally { raw.close(); }
  });
});
