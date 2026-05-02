import { describe, expect, it } from 'vitest';
import { createAuditHash } from '../services/auditService';

describe('createAuditHash', () => {
  it('creates stable hashes for identical payloads', () => {
    const event = { action: 'case.opened', entityType: 'case', entityId: '1' };
    const hash1 = createAuditHash(event, '2026-05-02T10:00:00.000Z');
    const hash2 = createAuditHash(event, '2026-05-02T10:00:00.000Z');
    expect(hash1).toBe(hash2);
  });
});
