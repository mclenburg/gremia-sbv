import { describe, expect, it } from 'vitest';
import { buildRetentionDashboard } from '../services/retentionPolicy';

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
});
