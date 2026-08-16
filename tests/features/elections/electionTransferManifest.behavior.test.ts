import { describe, expect, it } from 'vitest';
import { createElectionTransferManifest, electionManifestHash, sha256Canonical } from '../../../services/electionTransferPolicy';

describe('election transfer manifest', () => {
  it('normalizes item order so equivalent manifests hash deterministically', () => {
    const a = { ref: 'a', entityType: 'candidate', sha256: sha256Canonical({ a: 1 }) };
    const b = { ref: 'b', entityType: 'result', sha256: sha256Canonical({ b: 2 }) };
    const first = createElectionTransferManifest('e1', 'b'.repeat(64), [b, a], '2026-08-16T06:00:00.000Z');
    const second = { ...first, items: [a, b] };
    expect(first.items).toEqual([a, b]);
    expect(electionManifestHash(first)).toBe(electionManifestHash(second));
  });

  it('rejects duplicate package references instead of accepting an ambiguous manifest', () => {
    const item = { ref: 'same', entityType: 'election', sha256: sha256Canonical({ id: 'e1' }) };
    expect(() => createElectionTransferManifest('e1', 'b'.repeat(64), [item, item])).toThrow();
  });
});
