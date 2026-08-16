import { describe, expect, it } from 'vitest';
import { RetentionOwnerRegistry } from '../../../services/retentionOwnerRegistry';

const registry = new RetentionOwnerRegistry();

describe('RetentionOwnerRegistry', () => {
  it('models case-independent SBV office owners without manufacturing case ids', () => {
    expect(registry.list().map((item) => item.type)).toEqual([
      'case', 'election', 'meeting', 'assembly', 'inclusion_agreement', 'employer_obligation_review',
    ]);
    expect(registry.get('election')).toMatchObject({ table: 'sbv_elections', retentionColumn: 'retention_until' });
    expect(registry.get('meeting')).toMatchObject({ table: 'sbv_meetings', retentionColumn: 'retention_until' });
  });

  it('checks owner existence through the registered aggregate table', () => {
    const calls: unknown[][] = [];
    const db = { prepare: () => ({ get: (...args: unknown[]) => { calls.push(args); return { present: 1 }; } }) } as never;
    expect(registry.exists(db, { type: 'assembly', id: 'assembly-2026' })).toBe(true);
    expect(calls).toEqual([['assembly-2026']]);
  });
});

describe('retention owner policy integration', () => {
  it('keeps all explicitly registered non-case owner kinds eligible for managed scans', () => {
    const managed = registry.list().filter((item) => item.retentionColumn !== null).map((item) => item.type);
    expect(managed).toEqual(['election', 'meeting', 'assembly', 'inclusion_agreement', 'employer_obligation_review']);
  });
});
