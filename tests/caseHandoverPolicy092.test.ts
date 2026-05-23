import { describe, expect, it } from 'vitest';
import { buildCandidateMatches, canImportPackage, handoverExpiryState, isExpired, safeAuditMetadata, assertAuditMetadataContainsNoPersonalData } from '../services/caseHandoverPolicy';

describe('case handover policy 0.9.2', () => {
  it('findet passende Import-Gegenstücke über Aktenzeichen und Namen ohne Cross-Instance-ID-Vertrauen', () => {
    const matches = buildCandidateMatches({
      exportedCaseNumber: 'SBV-2026-17',
      exportedDisplayName: 'Muster, Maya',
      exportedFirstName: 'Maya',
      exportedLastName: 'Muster',
      localCases: [
        { id: 'local-1', case_number: 'SBV-2026-17', display_name: 'Andere Anzeige' },
        { id: 'local-2', case_number: 'SBV-2026-99', display_name: 'Muster, Maya' },
        { id: 'local-3', case_number: 'SBV-2026-42', display_name: 'Unverbunden', protected_first_name: 'Maya', protected_last_name: 'Muster' },
      ],
    });
    expect(matches.map((m) => m.localCaseId)).toEqual(['local-1', 'local-2', 'local-3']);
    expect(matches[0].reason).toBe('case_number');
  });

  it('erzwingt Audit-Metadaten ohne personenbeziehbare Inhalte', () => {
    const metadata = safeAuditMetadata({ packageId: 'handover_123', caseCount: 1, measureCount: 2, documentCount: 3, deadlineCount: 4, hasExpiry: true, expiresAt: '2026-07-31T23:59:59.000Z', mode: 'create_new', result: 'success' });
    expect(metadata).toMatchObject({ packageId: 'handover_123', caseCount: 1, measureCount: 2, result: 'success' });
    expect(JSON.stringify(metadata)).not.toMatch(/Muster|Maya|Diagnose|Personalnummer|Notiz/i);
    expect(assertAuditMetadataContainsNoPersonalData(metadata)).toBe(true);
  });

  it('unterscheidet Importgültigkeit und späteren Ablauf bereits importierter Übergabedaten', () => {
    const now = new Date('2026-05-23T10:00:00.000Z');
    expect(isExpired('2026-05-22T23:59:59.000Z', now)).toBe(true);
    expect(canImportPackage('2026-05-22T23:59:59.000Z', now)).toBe(false);
    expect(canImportPackage('2026-05-24T23:59:59.000Z', now)).toBe(true);
    expect(canImportPackage(undefined, now)).toBe(true);
    expect(handoverExpiryState('2026-05-22T23:59:59.000Z', now)).toBe('expired');
    expect(handoverExpiryState('2026-05-24T23:59:59.000Z', now)).toBe('valid');
    expect(handoverExpiryState(undefined, now)).toBe('no_expiry');
  });
});
