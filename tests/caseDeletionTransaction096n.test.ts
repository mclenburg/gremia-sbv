import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService.js';
import { runCaseDeletionTransaction } from '../services/caseDeletionTransaction.js';

function transactionDatabase(log: string[]): DatabaseAdapter {
  return {
    exec(sql: string) { log.push(sql); },
    prepare() { throw new Error('not used'); },
    pragma() { return undefined; },
    close() {},
  };
}

describe('runCaseDeletionTransaction', () => {
  it('enforces dependency deletion, mandatory audit, case deletion and retention evidence in this order', () => {
    const log: string[] = [];
    const db = transactionDatabase(log);

    runCaseDeletionTransaction(db, {
      deleteDependentData: () => log.push('dependent-delete'),
      appendMandatoryCaseAudit: () => log.push('case-audit'),
      deleteCaseRecord: () => log.push('case-delete'),
      recordRetentionAction: () => log.push('retention-action'),
    });

    expect(log[0]).toMatch(/^SAVEPOINT gremia_uow_/);
    expect(log.slice(1, -1)).toEqual([
      'dependent-delete',
      'case-audit',
      'case-delete',
      'retention-action',
    ]);
    expect(log.at(-1)).toMatch(/^RELEASE SAVEPOINT gremia_uow_/);
  });

  it('rolls back and never deletes the case record when the mandatory audit fails', () => {
    const log: string[] = [];
    const db = transactionDatabase(log);
    const auditFailure = new Error('hash-chain unavailable');

    expect(() => runCaseDeletionTransaction(db, {
      deleteDependentData: () => log.push('dependent-delete'),
      appendMandatoryCaseAudit: () => {
        log.push('case-audit');
        throw auditFailure;
      },
      deleteCaseRecord: () => log.push('case-delete'),
      recordRetentionAction: () => log.push('retention-action'),
    })).toThrow(auditFailure);

    expect(log).toContain('dependent-delete');
    expect(log).toContain('case-audit');
    expect(log).not.toContain('case-delete');
    expect(log).not.toContain('retention-action');
    expect(log.some((entry) => entry.startsWith('ROLLBACK TO SAVEPOINT gremia_uow_'))).toBe(true);
  });
});
