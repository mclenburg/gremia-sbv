import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseScopedServiceCache } from '../../../electron/applicationServices.js';

describe('DatabaseScopedServiceCache', () => {
  it('reuses one service instance for the same database and service key', () => {
    const cache = new DatabaseScopedServiceCache();
    const database = {};
    const factory = vi.fn(() => ({ id: randomUUID() }));

    const first = cache.get(database, 'bem', factory);
    const second = cache.get(database, 'bem', factory);

    expect(second).toBe(first);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('keeps services isolated between active database instances', () => {
    const cache = new DatabaseScopedServiceCache();
    const firstDatabase = {};
    const secondDatabase = {};
    let sequence = 0;

    const first = cache.get(firstDatabase, 'deadlines', () => ({ sequence: ++sequence }));
    const second = cache.get(secondDatabase, 'deadlines', () => ({ sequence: ++sequence }));

    expect(first).not.toBe(second);
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
  });

  it('keeps different service types separate inside one database scope', () => {
    const cache = new DatabaseScopedServiceCache();
    const database = {};

    const bem = cache.get(database, 'bem', () => ({ kind: 'bem' }));
    const prevention = cache.get(database, 'prevention', () => ({ kind: 'prevention' }));

    expect(bem).not.toBe(prevention);
    expect(bem.kind).toBe('bem');
    expect(prevention.kind).toBe('prevention');
  });
});
