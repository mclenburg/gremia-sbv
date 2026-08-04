import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { ActivityReportIntegrityError, ActivityReportProjectionService } from '../services/activityReportProjectionService';
import { computeAuditEntryHash, PERSONAL_DATA_AUDIT_GENESIS_HASH } from '../services/auditHashChain';

function chainRows(events: Array<{ occurredAt: string; metadata: Record<string, unknown> }>) {
  let previousHash = PERSONAL_DATA_AUDIT_GENESIS_HASH;
  return events.map((event, index) => {
    const sequence = index + 1;
    const metadataJson = JSON.stringify(event.metadata);
    const base = { sequence, occurredAt: event.occurredAt, actor: 'local-sbv-user', action: 'create', subjectType: 'measure_lifecycle', subjectId: `m-${sequence}`, caseId: null, purpose: 'Maßnahmen-Lifecycle', metadataJson, previousHash };
    const entryHash = computeAuditEntryHash(base);
    previousHash = entryHash;
    return { ...base, occurred_at: base.occurredAt, subject_type: base.subjectType, subject_id: base.subjectId, case_id: base.caseId, metadata_json: metadataJson, previous_hash: base.previousHash, entry_hash: entryHash };
  });
}

function dbFor(rows: any[]): DatabaseAdapter {
  return { prepare: () => ({ all: () => rows, get: () => undefined, run: () => ({ changes: 0 }) }), exec: () => undefined, pragma: () => [] } as unknown as DatabaseAdapter;
}

const meta = (eventName: string, measureType = 'bem', creationSource?: string) => ({ schemaVersion: '1', eventName, measureType, ...(creationSource ? { creationSource } : {}) });

describe('ActivityReportProjectionService', () => {
  it('aggregiert Lifecycle-Ereignisse im gewählten Zeitraum und ignoriert Baselines', () => {
    const rows = chainRows([
      { occurredAt: '2026-01-05T10:00:00.000Z', metadata: meta('created') },
      { occurredAt: '2026-01-06T10:00:00.000Z', metadata: meta('completed') },
      { occurredAt: '2026-01-07T10:00:00.000Z', metadata: meta('deleted') },
      { occurredAt: '2026-01-08T10:00:00.000Z', metadata: meta('created', 'prevention', 'migration_baseline') },
      { occurredAt: '2026-02-01T10:00:00.000Z', metadata: meta('created', 'recruiting') },
    ]);
    const result = new ActivityReportProjectionService(dbFor(rows)).build({ start: '2026-01-01', end: '2026-01-31' });
    expect(result.counters.created.bem).toBe(1);
    expect(result.counters.completed.bem).toBe(1);
    expect(result.counters.deleted.bem).toBe(1);
    expect(result.counters.created.recruiting).toBe(0);
    expect(result.ignoredBaselineEvents).toBe(1);
    expect(result.chain.verified).toBe(true);
  });

  it('bricht bei einer manipulierten HashChain ab', () => {
    const rows = chainRows([{ occurredAt: '2026-01-05T10:00:00.000Z', metadata: meta('created') }]);
    rows[0].metadata_json = JSON.stringify(meta('deleted'));
    expect(() => new ActivityReportProjectionService(dbFor(rows)).build()).toThrow(ActivityReportIntegrityError);
  });

  it('wertet keine IDs oder Zwecktexte aus', () => {
    const rows = chainRows([{ occurredAt: '2026-01-05T10:00:00.000Z', metadata: meta('created', 'termination_hearing') }]);
    rows[0].subject_id = 'Person Max Mustermann';
    rows[0].purpose = 'beliebiger Freitext';
    // Die geänderten Chain-Felder müssen neu gehasht werden; fachlich zählt allein metadata_json.
    const base = { sequence: 1, occurredAt: rows[0].occurred_at, actor: rows[0].actor, action: rows[0].action, subjectType: rows[0].subject_type, subjectId: rows[0].subject_id, caseId: null, purpose: rows[0].purpose, metadataJson: rows[0].metadata_json, previousHash: PERSONAL_DATA_AUDIT_GENESIS_HASH };
    rows[0].previous_hash = PERSONAL_DATA_AUDIT_GENESIS_HASH;
    rows[0].entry_hash = computeAuditEntryHash(base);
    const result = new ActivityReportProjectionService(dbFor(rows)).build();
    expect(result.counters.created.termination_hearing).toBe(1);
  });

  it('kennzeichnet Zeiträume vor Einführung des Lifecycle-Protokolls als teilweise abgedeckt', () => {
    const rows = chainRows([
      { occurredAt: '2026-03-01T10:00:00.000Z', metadata: meta('created', 'bem', 'migration_baseline') },
      { occurredAt: '2026-03-02T10:00:00.000Z', metadata: meta('created', 'prevention') },
    ]);
    const result = new ActivityReportProjectionService(dbFor(rows)).build({ start: '2026-01-01', end: '2026-03-31' });
    expect(result.coverage.status).toBe('partial');
    expect(result.coverage.lifecycleStartedAt).toBe('2026-03-01T10:00:00.000Z');
    expect(result.warnings.some((warning) => warning.includes('vor Einführung'))).toBe(true);
  });

  it('kennzeichnet einen vollständig durch das Lifecycle-Protokoll abgedeckten Zeitraum', () => {
    const rows = chainRows([
      { occurredAt: '2026-03-01T10:00:00.000Z', metadata: meta('created', 'bem', 'migration_baseline') },
      { occurredAt: '2026-03-02T10:00:00.000Z', metadata: meta('created', 'prevention') },
    ]);
    const result = new ActivityReportProjectionService(dbFor(rows)).build({ start: '2026-03-01', end: '2026-03-31' });
    expect(result.coverage.status).toBe('complete');
  });
});
