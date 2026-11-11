import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { recordVacationV5Export } from '../../../../services/caseHandoverExportLedger';

describe('Format-5-Exportledger', () => {
  it('speichert Ziel-Fingerprint, Format und Quell-Baselines ohne fachliche Inhalte', () => {
    const raw = new DatabaseSync(':memory:');
    try {
      raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      const db = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
        all: (...args: unknown[]) => statement.all(...args as []) as T[], get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
        run: (...args: unknown[]) => statement.run(...args as []),
      }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
      recordVacationV5Export(db, { packageId: 'handover_v5_ledger', createdAt: '2026-11-11T10:00:00.000Z', expiresAt: '2099-11-30',
        targetInstanceId: 'ABCDE', targetKeyFingerprint: 'a'.repeat(64),
        sourceByRef: { meeting_1: { kind: 'meeting', localId: 'local-secret-id', baselineSha256: 'b'.repeat(64) } } });
      expect(raw.prepare('SELECT format_version, target_key_fingerprint, case_count, status FROM case_handover_exports').get())
        .toEqual({ format_version: 5, target_key_fingerprint: 'a'.repeat(64), case_count: 0, status: 'open' });
      expect(raw.prepare('SELECT package_ref, local_entity_id, baseline_sha256 FROM case_handover_export_items').get())
        .toEqual({ package_ref: 'meeting_1', local_entity_id: 'local-secret-id', baseline_sha256: 'b'.repeat(64) });
      expect(String((raw.prepare('SELECT metadata_json FROM case_handover_exports').get() as { metadata_json: string }).metadata_json)).not.toContain('local-secret-id');
    } finally { raw.close(); }
  });
});
