import { describe, expect, it } from 'vitest';
import { buildRetentionDashboard } from '../../services/retentionPolicy';

const now = new Date('2026-05-07T12:00:00.000Z');

describe('retention policy behavior coverage', () => {
  it('orders critical candidates before warnings and informational entries', () => {
    const dashboard = buildRetentionDashboard({
      now,
      settings: { closedCaseReviewMonths: 12, inactiveOpenCaseMonths: 3, orphanContactReviewDays: 30 },
      cases: [
        { id: 'case-closed', caseNumber: 'SBV-001', status: 'abgeschlossen', closedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'case-open', caseNumber: 'SBV-002', status: 'offen', openedAt: '2025-01-01T00:00:00.000Z', openDeadlineCount: 0 }
      ],
      documents: [{ id: 'doc-1', displayTitle: 'Attest', hasMetadata: false, fileExists: true }],
      contacts: [{ id: 'contact-1', displayName: 'Kontakt ohne Bezug', createdAt: '2026-01-01T00:00:00.000Z', referenceCount: 0 }]
    });

    expect(dashboard.counts).toMatchObject({ total: 4, critical: 1, warning: 1, info: 2 });
    expect(dashboard.candidates[0].riskLevel).toBe('critical');
    expect(dashboard.candidates[1].riskLevel).toBe('warning');
  });

  it('does not flag cancelled free deadlines and flags old completed deadlines', () => {
    const dashboard = buildRetentionDashboard({
      now,
      settings: { completedDeadlineRetentionMonths: 6 },
      deadlines: [
        { id: 'cancelled', title: 'abgesagt', status: 'cancelled', isLegalDeadline: true },
        { id: 'done-old', title: 'alte Wiedervorlage', status: 'done', completedAt: '2025-01-01T00:00:00.000Z', caseId: 'case-1' }
      ]
    });

    expect(dashboard.counts.total).toBe(1);
    expect(dashboard.candidates[0]).toMatchObject({ id: 'deadline-completed-done-old', riskLevel: 'info' });
  });

  it('uses openedAt when lastActivityAt is missing and ignores invalid dates', () => {
    const dashboard = buildRetentionDashboard({
      now,
      settings: { inactiveOpenCaseMonths: 6 },
      cases: [
        { id: 'old-opened', caseNumber: 'SBV-ALT', status: 'offen', openedAt: '2025-01-01T00:00:00.000Z' },
        { id: 'invalid', caseNumber: 'SBV-INVALID', status: 'offen', openedAt: 'kein-datum' }
      ]
    });

    expect(dashboard.candidates.map((candidate) => candidate.entityId)).toContain('old-opened');
    expect(dashboard.candidates.map((candidate) => candidate.entityId)).not.toContain('invalid');
  });

  it('offers due non-case office workflows for review but respects active legal holds', () => {
    const dashboard = buildRetentionDashboard({
      now,
      officeOwners: [
        { ownerType: 'meeting', ownerId: 'm-due', reference: 'BR-Sitzung', retentionUntil: '2026-05-01T00:00:00.000Z', legalHoldActive: false },
        { ownerType: 'election', ownerId: 'e-held', reference: 'SBV-Wahl', retentionUntil: '2026-04-01T00:00:00.000Z', legalHoldActive: true, legalHoldReasonKey: 'election_challenge' },
      ],
    });
    expect(dashboard.candidates).toEqual([
      expect.objectContaining({ type: 'office_workflow_review_due', entityType: 'meeting', entityId: 'm-due' }),
    ]);
  });

  it('hält eine Person mit verknüpftem Gleichstellungsverfahren aus der Löschprüfung heraus', () => {
    const linked = buildRetentionDashboard({
      now,
      protectedPersons: [{
        id: 'person-linked',
        displayName: 'Person mit Verfahren',
        createdAt: '2026-01-01T00:00:00.000Z',
        retainedReferenceCount: 1,
        lifecycleState: 'active',
        protectionStatus: 'application_pending',
        employmentState: 'active_employee',
      }],
    });
    const unlinked = buildRetentionDashboard({
      now,
      protectedPersons: [{
        id: 'person-unlinked',
        displayName: 'Person ohne Vorgang',
        createdAt: '2026-01-01T00:00:00.000Z',
        retainedReferenceCount: 0,
        lifecycleState: 'active',
        protectionStatus: 'application_pending',
        employmentState: 'active_employee',
      }],
    });

    expect(linked.candidates).toHaveLength(0);
    expect(unlinked.candidates).toEqual([
      expect.objectContaining({ entityType: 'protected_person', entityId: 'person-unlinked', policyKey: 'protected_person' }),
    ]);
  });

  it('behält beschäftigte schwerbehinderte und gleichgestellte Personen für künftige Beteiligungsprüfungen', () => {
    const dashboard = buildRetentionDashboard({
      now,
      protectedPersons: [
        {
          id: 'person-severely-disabled', displayName: 'Schwerbehinderte Person', createdAt: '2020-01-01T00:00:00.000Z',
          retainedReferenceCount: 0, lifecycleState: 'active', protectionStatus: 'severely_disabled', employmentState: 'active_employee',
        },
        {
          id: 'person-equivalent', displayName: 'Gleichgestellte Person', createdAt: '2020-01-01T00:00:00.000Z',
          retainedReferenceCount: 0, lifecycleState: 'active', protectionStatus: 'equivalent', employmentState: 'active_employee',
        },
      ],
    });

    expect(dashboard.candidates).toHaveLength(0);
  });

  it('merkt Personen mit beendetem Arbeitsverhältnis auch bei vorhandenem Fallbezug zur manuellen Prüfung vor', () => {
    const dashboard = buildRetentionDashboard({
      now,
      protectedPersons: [{
        id: 'person-left-company',
        displayName: 'Ausgeschiedene Person',
        createdAt: '2020-01-01T00:00:00.000Z',
        retainedReferenceCount: 1,
        lifecycleState: 'active',
        protectionStatus: 'severely_disabled',
        employmentState: 'left_company',
        leftCompanyAt: '2026-04-30T00:00:00.000Z',
      }],
    });

    expect(dashboard.candidates).toEqual([
      expect.objectContaining({ entityType: 'protected_person', entityId: 'person-left-company', recommendedAction: 'pruefen' }),
    ]);
  });

  it('markiert abgeschlossene Gleichstellungs-/GdB-Verfahren nach drei Jahren zur manuellen Prüfung', () => {
    const dashboard = buildRetentionDashboard({
      now: new Date('2029-06-02T00:00:00.000Z'),
      moduleRecords: [{
        module: 'equalization_gdb',
        id: 'eq-1',
        title: 'GdB-Verfahren · SBV-GDB-001',
        status: 'abgeschlossen',
        completedAt: '2026-06-01T00:00:00.000Z',
      }],
    });

    expect(dashboard.candidates).toEqual([
      expect.objectContaining({
        type: 'module_retention_review_due',
        entityType: 'equalization_gdb',
        entityId: 'eq-1',
        recommendedAction: 'pruefen',
      }),
    ]);
  });

});
