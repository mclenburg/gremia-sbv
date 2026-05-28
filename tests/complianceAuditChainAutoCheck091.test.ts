import { describe, expect, it } from 'vitest';
import { auditChainStatusItem } from '../src/app/features/compliance/complianceViewUtils';
import type { ComplianceAuditChainStatus } from '../src/app/core/models/compliance.model';

describe('0.9.1 Compliance Audit-Hash-Chain', () => {
  it('bildet eine intakte Audit-Hash-Chain als OK-Status für die Compliance-Karte ab', () => {
    const status: ComplianceAuditChainStatus = {
      ok: true,
      checked: 12,
      issues: [],
      firstSequence: 1,
      lastSequence: 12,
      latestHash: 'abcdef0123456789abcdef0123456789',
      algorithm: 'sha256',
      chainVersion: 1,
    };

    const item = auditChainStatusItem(status);

    expect(item).toMatchObject({ id: 'audit-chain', label: 'Audit-Hash-Chain', level: 'ok' });
    expect(item.summary).toContain('Hash-Kette intakt');
    expect(item.detail).toContain('letzter Hash abcdef012345');
  });

  it('bildet eine auffällige Audit-Hash-Chain als Problemstatus ab', () => {
    const status: ComplianceAuditChainStatus = {
      ok: false,
      checked: 12,
      issues: [{ kind: 'previous_hash_mismatch', sequence: 8, message: 'Hash passt nicht zur Vorgängerzeile.' }],
      firstSequence: 1,
      lastSequence: 12,
      firstBrokenSequence: 8,
      latestHash: 'abcdef0123456789abcdef0123456789',
      algorithm: 'sha256',
      chainVersion: 1,
    };

    const item = auditChainStatusItem(status);

    expect(item.level).toBe('problem');
    expect(item.summary).toContain('Hash-Kette auffällig');
    expect(item.detail).toContain('Erste auffällige Sequenz: 8');
  });

  it('liefert bei fehlender Prüfung einen sicheren Warnstatus', () => {
    const item = auditChainStatusItem(undefined);

    expect(item.level).toBe('warning');
    expect(item.summary).toContain('konnte nicht geprüft werden');
  });
});
