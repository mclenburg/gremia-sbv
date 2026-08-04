import { describe, expect, it } from 'vitest';
import { DatabaseUnitOfWork } from '../services/databaseUnitOfWork.js';
import type { DatabaseAdapter } from '../services/databaseService.js';

function adapter(log: string[], failOn?: string): DatabaseAdapter {
  return {
    exec(sql: string) {
      log.push(sql);
      if (sql === failOn) throw new Error(`failed: ${sql}`);
    },
    prepare() {
      throw new Error('not used');
    },
    pragma() {
      throw new Error('not used');
    },
    close() {}
  };
}

describe('DatabaseUnitOfWork', () => {
  it('commits a successful mandatory operation', () => {
    const log: string[] = [];
    const result = new DatabaseUnitOfWork(adapter(log)).run(() => {
      log.push('domain-write');
      log.push('mandatory-audit');
      return 42;
    });

    expect(result).toBe(42);
    expect(log).toEqual(['BEGIN IMMEDIATE', 'domain-write', 'mandatory-audit', 'COMMIT']);
  });

  it('rolls back the complete operation when a mandatory step fails', () => {
    const log: string[] = [];
    const error = new Error('audit unavailable');

    expect(() => new DatabaseUnitOfWork(adapter(log)).run(() => {
      log.push('domain-write');
      throw error;
    })).toThrow(error);

    expect(log).toEqual(['BEGIN IMMEDIATE', 'domain-write', 'ROLLBACK']);
  });

  it('does not replace the original failure when rollback also fails', () => {
    const log: string[] = [];
    const original = new Error('mandatory audit failed');

    expect(() => new DatabaseUnitOfWork(adapter(log, 'ROLLBACK')).run(() => {
      throw original;
    })).toThrow(original);
    expect(log).toEqual(['BEGIN IMMEDIATE', 'ROLLBACK']);
  });
});
