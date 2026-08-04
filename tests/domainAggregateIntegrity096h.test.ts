import { describe, expect, it } from 'vitest';
import { DomainAggregateIntegrityError, DomainAggregateIntegrityService } from '../services/domainAggregateIntegrityService.js';

type Row = { count: number };
class IntegrityDb {
  constructor(private readonly counts: number[]) {}
  prepare<T>(_sql: string) {
    return { get: (..._args: unknown[]) => ({ count: this.counts.shift() ?? 0 } as T) };
  }
}

describe('Fachmodell-Integrität', () => {
  it('akzeptiert ausschließlich 1:1-Erweiterungen mit passendem Root-Typ', () => {
    const result = new DomainAggregateIntegrityService(new IntegrityDb([0, 0, 0, 0]) as never).verify();
    expect(result.checkedExtensions).toBe(2);
  });

  it('bricht bei verwaisten oder typfremden Erweiterungen ab', () => {
    expect(() => new DomainAggregateIntegrityService(new IntegrityDb([1, 0, 0, 2]) as never).verify())
      .toThrow(DomainAggregateIntegrityError);
  });
});
