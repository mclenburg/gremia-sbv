import { describe, expect, it } from 'vitest';
import { buildRetentionDashboard, normalizeRetentionSettings } from '../services/retentionPolicy';

describe('retention policy', () => {
  const now = new Date('2026-05-02T12:00:00.000Z');

  it('marks closed cases as review candidates after the configured retention window', () => {
    const dashboard = buildRetentionDashboard({
      now,
      settings: { closedCaseReviewMonths: 12 },
      cases: [{ id: 'c1', caseNumber: 'SBV-ALT', status: 'abgeschlossen', closedAt: '2025-01-01T00:00:00.000Z' }]
    });

    expect(dashboard.counts.total).toBe(1);
    expect(dashboard.candidates[0]).toMatchObject({
      type: 'closed_case_review',
      entityType: 'case',
      entityId: 'c1',
      reference: 'SBV-ALT',
      recommendedAction: 'anonymisieren'
    });
  });

  it('does not mark freshly closed cases as deletion candidates', () => {
    const dashboard = buildRetentionDashboard({
      now,
      settings: { closedCaseReviewMonths: 24 },
      cases: [{ id: 'c1', caseNumber: 'SBV-NEU', status: 'abgeschlossen', closedAt: '2026-04-01T00:00:00.000Z' }]
    });

    expect(dashboard.counts.total).toBe(0);
  });

  it('marks legal deadlines without case reference as critical', () => {
    const dashboard = buildRetentionDashboard({
      now,
      deadlines: [{ id: 'd1', title: 'SBV-Stellungnahme', status: 'open', isLegalDeadline: true, dueAt: '2026-05-03T12:00:00.000Z' }]
    });

    expect(dashboard.counts.critical).toBe(1);
    expect(dashboard.candidates[0]).toMatchObject({
      type: 'free_deadline_review',
      riskLevel: 'critical'
    });
  });

  it('marks cleartext files in protected storage as critical', () => {
    const dashboard = buildRetentionDashboard({
      now,
      cleartextFiles: ['documents/c1/anschreiben.pdf']
    });

    expect(dashboard.counts.critical).toBe(1);
    expect(dashboard.candidates[0].type).toBe('cleartext_file_review');
  });

  it('normalizes default settings', () => {
    const settings = normalizeRetentionSettings({ closedCaseReviewMonths: 18 });
    expect(settings.closedCaseReviewMonths).toBe(18);
    expect(settings.minimumGroupSizeForReports).toBeGreaterThanOrEqual(3);
  });
});
