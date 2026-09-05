import { describe, expect, it } from 'vitest';
import {
  assertAuditMetadataContainsNoPersonalData,
  buildCandidateMatches,
  buildCaseHandoverImportPlan,
  canImportPackage,
  handoverExpiryState,
  isExpired,
  safeAuditMetadata,
} from '../../../../services/caseHandoverPolicy';

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

  it('klassifiziert echte Importkonflikte und erzwingt einen prüfbaren Importplan', () => {
    const matches = buildCandidateMatches({
      exportedCaseNumber: 'SBV-2026-17',
      exportedDisplayName: 'Muster, Maya',
      exportedFirstName: 'Maya',
      exportedLastName: 'Muster',
      localCases: [
        { id: 'local-1', case_number: 'SBV-2026-17', display_name: 'Andere Person', protected_first_name: 'Erika', protected_last_name: 'Beispiel' },
        { id: 'local-2', case_number: 'SBV-2026-99', display_name: 'Muster, Maya', protected_first_name: 'Maya', protected_last_name: 'Muster' },
      ],
    });

    expect(matches[0]).toMatchObject({
      localCaseId: 'local-1',
      reason: 'case_number',
      confidence: 'high',
      conflictLevel: 'true_conflict',
    });
    expect(matches[1]).toMatchObject({
      localCaseId: 'local-2',
      reason: 'name',
      conflictLevel: 'possible_match',
    });

    const plan = buildCaseHandoverImportPlan({
      caseCount: 1,
      measureCount: 2,
      documentCount: 3,
      deadlineCount: 4,
      expiresAt: '2026-07-31T23:59:59.000Z',
      isExpired: false,
      matches,
    });

    expect(plan).toMatchObject({
      transferKind: 'case_handover',
      defaultMode: 'create_new',
      requiresExplicitDecision: true,
      privacyReviewRequired: true,
      retentionReviewRequired: true,
      conflictCount: 1,
      possibleMatchCount: 1,
      safeMatchCount: 0,
    });
    expect(plan.decisions.map((item) => item.id)).toEqual(
      expect.arrayContaining(['scope_confirm', 'merge_conflict_review', 'privacy_review_after_import'])
    );
  });

  it('schlägt Zusammenführung nur bei genau einem sicheren Gegenstück vor', () => {
    const safePlan = buildCaseHandoverImportPlan({
      caseCount: 1,
      measureCount: 1,
      documentCount: 0,
      deadlineCount: 0,
      isExpired: false,
      matches: [{ localCaseId: 'local-1', caseNumber: 'SBV-2026-17', displayName: 'Muster, Maya', reason: 'case_number', confidence: 'high', conflictLevel: 'safe_match' }],
    });

    const ambiguousPlan = buildCaseHandoverImportPlan({
      caseCount: 1,
      measureCount: 1,
      documentCount: 0,
      deadlineCount: 0,
      isExpired: false,
      matches: [{ localCaseId: 'local-2', caseNumber: 'SBV-2026-99', displayName: 'Muster, Maya', reason: 'name', confidence: 'medium', conflictLevel: 'possible_match' }],
    });

    expect(safePlan).toMatchObject({ defaultMode: 'merge_existing', mergeAllowed: true, safeMatchCount: 1 });
    expect(ambiguousPlan).toMatchObject({ defaultMode: 'create_new', mergeAllowed: true, possibleMatchCount: 1 });
  });

  it('verhindert die Zusammenführung mehrerer Übergabefälle in eine einzelne Zielakte', () => {
    const plan = buildCaseHandoverImportPlan({
      caseCount: 2,
      measureCount: 0,
      documentCount: 0,
      deadlineCount: 0,
      isExpired: false,
      matches: [{ localCaseId: 'local-1', caseNumber: 'SBV-2026-17', displayName: 'Fallakte', reason: 'case_number', confidence: 'high', conflictLevel: 'safe_match' }],
    });

    expect(plan).toMatchObject({ defaultMode: 'create_new', mergeAllowed: false });
    expect(plan.decisions.some((item) => item.id === 'multi_case_create_new')).toBe(true);
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
