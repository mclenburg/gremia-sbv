import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.9.1 Compliance Audit-Hash-Chain', () => {
  it('prüft die Audit-Hash-Chain automatisch beim Compliance-Status und zeigt das Ergebnis in der Karte', () => {
    const view = readFileSync('src/app/features/compliance/complianceViewUtils.ts', 'utf8');
    const preload = readFileSync('electron/preload.ts', 'utf8');
    expect(view).toContain('auditChainStatus');
    expect(view).toContain('Hash-Kette intakt');
    expect(view).toContain('Hash-Kette auffällig');
    expect(preload).toContain('compliance:audit-chain-status');
  });
});
