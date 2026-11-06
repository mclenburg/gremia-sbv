import { describe, expect, it } from 'vitest';
import { computeAuditEntryHash, PERSONAL_DATA_AUDIT_GENESIS_HASH } from '../../services/auditHashChain.js';
import { PersonalDataAuditLogService } from '../../services/auditLogService.js';
import type { DatabaseAdapter } from '../../services/databaseService.js';

describe('Audit-Prüfung bei großen Beständen', () => {
  it('prüft alle Einträge über einen Iterator, ohne die gesamte Tabelle als Array zu laden', () => {
    const count = 2000;
    const database = {
      prepare: () => ({
        all: () => { throw new Error('Die gesamte Audit-Tabelle darf nicht geladen werden.'); },
        iterate: function* () {
          let previousHash = PERSONAL_DATA_AUDIT_GENESIS_HASH;
          for (let sequence = 1; sequence <= count; sequence += 1) {
            const entryHash = computeAuditEntryHash({
              sequence, occurredAt: '2026-11-05T10:00:00.000Z', actor: 'local-sbv-user',
              action: 'read', subjectType: 'case', purpose: 'SBV-Datenschutzereignis',
              metadataJson: '{}', previousHash,
            });
            yield {
              id: `audit-${sequence}`, sequence, occurred_at: '2026-11-05T10:00:00.000Z',
              actor: 'local-sbv-user', action: 'read', subject_type: 'case',
              subject_id: null, case_id: null, purpose: 'SBV-Datenschutzereignis',
              metadata_json: '{}', previous_hash: previousHash, entry_hash: entryHash, entry_mac: null,
            };
            previousHash = entryHash;
          }
        },
      }),
    } as unknown as DatabaseAdapter;

    const result = new PersonalDataAuditLogService(database).verifyChain();
    expect(result).toMatchObject({ ok: true, checked: count, firstSequence: 1, lastSequence: count, issues: [] });
  });

  it('gibt zwischen begrenzten Audit-Batches den Hauptprozess für andere Arbeit frei', async () => {
    const count = 240;
    let readRows = 0;
    let otherWorkRan = false;
    const hashes = [PERSONAL_DATA_AUDIT_GENESIS_HASH];
    for (let sequence = 1; sequence <= count; sequence += 1) {
      hashes.push(computeAuditEntryHash({
        sequence, occurredAt: '2026-11-05T10:00:00.000Z', actor: 'local-sbv-user',
        action: 'read', subjectType: 'case', purpose: 'SBV-Datenschutzereignis',
        metadataJson: '{}', previousHash: hashes[sequence - 1],
      }));
    }
    const database = {
      prepare: (sql: string) => ({
        get: () => sql.includes('ORDER BY sequence DESC') ? { sequence: count } : undefined,
        all: (after: number, maximum: number, limit: number) => {
          const rows = [];
          for (let sequence = after + 1; sequence <= Math.min(maximum, after + limit); sequence += 1) {
            readRows += 1;
            rows.push({ id: `audit-${sequence}`, sequence, occurred_at: '2026-11-05T10:00:00.000Z',
              actor: 'local-sbv-user', action: 'read', subject_type: 'case', subject_id: null,
              case_id: null, purpose: 'SBV-Datenschutzereignis', metadata_json: '{}',
              previous_hash: hashes[sequence - 1], entry_hash: hashes[sequence], entry_mac: null });
          }
          return rows;
        },
      }),
    } as unknown as DatabaseAdapter;

    setImmediate(() => { otherWorkRan = true; });
    const result = await new PersonalDataAuditLogService(database).verifyChainInBatches(40);
    expect(result).toMatchObject({ ok: true, checked: count });
    expect(readRows).toBe(count);
    expect(otherWorkRan).toBe(true);
  });
});
