import { describe, expect, it } from 'vitest';
import { computeAuditEntryHash, PERSONAL_DATA_AUDIT_GENESIS_HASH } from '../../../services/auditHashChain';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ReportService } from '../../../services/reportService';

interface AuditSeed { action: string; subjectType: string; subjectId: string; metadata: Record<string, unknown> }

function auditChain(seeds: readonly AuditSeed[]) {
  let previousHash = PERSONAL_DATA_AUDIT_GENESIS_HASH;
  return seeds.map((seed, index) => {
    const sequence = index + 1;
    const occurredAt = `2026-01-${String(sequence).padStart(2, '0')}T10:00:00.000Z`;
    const metadataJson = JSON.stringify(seed.metadata);
    const payload = {
      sequence, occurredAt, actor: 'local-sbv-user', action: seed.action, subjectType: seed.subjectType,
      subjectId: seed.subjectId, caseId: seed.subjectType === 'case' ? seed.subjectId : null,
      purpose: 'Tätigkeit dokumentiert', metadataJson, previousHash,
    };
    const entryHash = computeAuditEntryHash(payload);
    previousHash = entryHash;
    return {
      sequence, occurred_at: occurredAt, actor: payload.actor, action: seed.action,
      subject_type: seed.subjectType, subject_id: seed.subjectId, case_id: payload.caseId,
      purpose: payload.purpose, metadata_json: metadataJson, previous_hash: payload.previousHash, entry_hash: entryHash,
    };
  });
}

class AuditOnlyDatabase implements DatabaseAdapter {
  readonly queries: string[] = [];
  constructor(private readonly rows: ReturnType<typeof auditChain>) {}
  prepare<T = unknown>(sql: string) {
    this.queries.push(sql);
    if (!/FROM\s+personal_data_audit_log/i.test(sql)) throw new Error(`Unzulässige Fachtabelle gelesen: ${sql}`);
    return {
      all: (..._params: unknown[]) => this.rows as T[],
      get: (..._params: unknown[]): T | undefined => undefined,
      run: (..._params: unknown[]) => ({}),
    };
  }
  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

describe('Tätigkeitsbericht aus der verifizierten Audit-Chain', () => {
  it('erzeugt alle Kennzahlen ohne Zugriff auf Fachtabellen', () => {
    const db = new AuditOnlyDatabase(auditChain([
      { action: 'create', subjectType: 'case', subjectId: 'case-1', metadata: { category: 'beratung' } },
      { action: 'create', subjectType: 'activity_journal', subjectId: 'journal-1', metadata: { category: 'documentation', status: 'final', hasTime: true } },
      { action: 'create', subjectType: 'sbv_participation_violation', subjectId: 'violation-1', metadata: { stage: 'request', status: 'open' } },
      { action: 'create', subjectType: 'measure_lifecycle', subjectId: 'bem-1', metadata: { schemaVersion: '1', eventName: 'created', measureType: 'bem', creationSource: 'system' } },
    ]));
    const report = new ReportService(() => db, () => '/not-used').build({ type: 'activity' });
    expect(report.metrics).toMatchObject({ 'Neue Fälle': 1, 'Neue Maßnahmen': 1, 'Journal-Einträge': 1, 'Beteiligungsverstöße': 1 });
    expect(db.queries).toHaveLength(1);
    expect(report.document.blocks.length).toBeGreaterThan(2);
  });
});
