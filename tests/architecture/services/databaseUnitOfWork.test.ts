import { describe, expect, it } from 'vitest';
import { DatabaseUnitOfWork } from '../../../services/databaseUnitOfWork.js';
import type { DatabaseAdapter } from '../../../services/databaseService.js';

function adapter(log: string[], failWhen?: (sql: string) => boolean): DatabaseAdapter {
  return {
    exec(sql: string) {
      log.push(sql);
      if (failWhen?.(sql)) throw new Error(`failed: ${sql}`);
    },
    prepare() { throw new Error('not used'); },
    pragma() { throw new Error('not used'); },
    close() {}
  };
}

describe('DatabaseUnitOfWork', () => {
  it('commits a successful mandatory operation through a savepoint', () => {
    const log: string[] = [];
    const result = new DatabaseUnitOfWork(adapter(log)).run(() => {
      log.push('domain-write');
      log.push('mandatory-audit');
      return 42;
    });

    expect(result).toBe(42);
    expect(log[0]).toMatch(/^SAVEPOINT gremia_uow_/);
    expect(log.slice(1, -1)).toEqual(['domain-write', 'mandatory-audit']);
    expect(log.at(-1)).toMatch(/^RELEASE SAVEPOINT gremia_uow_/);
  });

  it('rolls back the complete operation when a mandatory step fails', () => {
    const log: string[] = [];
    const error = new Error('audit unavailable');

    expect(() => new DatabaseUnitOfWork(adapter(log)).run(() => {
      log.push('domain-write');
      throw error;
    })).toThrow(error);

    expect(log[0]).toMatch(/^SAVEPOINT gremia_uow_/);
    expect(log[1]).toBe('domain-write');
    expect(log[2]).toMatch(/^ROLLBACK TO SAVEPOINT gremia_uow_/);
    expect(log[3]).toMatch(/^RELEASE SAVEPOINT gremia_uow_/);
  });

  it('supports nested transactional services without starting a second top-level transaction', () => {
    const log: string[] = [];
    const db = adapter(log);
    const outer = new DatabaseUnitOfWork(db);
    const inner = new DatabaseUnitOfWork(db);

    outer.run(() => {
      log.push('outer-write');
      inner.run(() => log.push('inner-write'));
    });

    expect(log.filter((entry) => entry.startsWith('SAVEPOINT '))).toHaveLength(2);
    expect(log).not.toContain('BEGIN IMMEDIATE');
    expect(log).not.toContain('COMMIT');
  });

  it('does not replace the original failure when rollback cleanup also fails', () => {
    const log: string[] = [];
    const original = new Error('mandatory audit failed');

    expect(() => new DatabaseUnitOfWork(adapter(log, (sql) => sql.startsWith('ROLLBACK TO SAVEPOINT'))).run(() => {
      throw original;
    })).toThrow(original);
  });
});
