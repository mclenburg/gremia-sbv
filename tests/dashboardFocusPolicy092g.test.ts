import { describe, expect, it } from 'vitest';
import { buildDashboardFocusSummary } from '../src/app/features/dashboard/dashboardFocusPolicy';

describe('dashboard focus policy 0.9.2-G', () => {
  it('keeps the dashboard focused on cases, deadline markers and compliance state', () => {
    const summary = buildDashboardFocusSummary({
      referenceDate: new Date('2026-05-22T10:00:00.000Z'),
      cases: [{ status: 'active' }, { status: 'closed' }, { status: 'open' }],
      deadlines: [
        { status: 'open', dueAt: '2026-05-24T10:00:00.000Z' },
        { status: 'overdue', dueAt: '2026-05-20T10:00:00.000Z' },
        { status: 'done', dueAt: '2026-05-21T10:00:00.000Z' },
      ],
      compliance: { ok: false, issueCount: 2 },
    });

    expect(summary.cases).toEqual({ total: 3, open: 2, marker: 'attention' });
    expect(summary.deadlines).toEqual({ totalOpen: 2, dueSoon: 1, overdue: 1, marker: 'warning' });
    expect(summary.compliance).toEqual({ ok: false, warnings: 2, marker: 'warning' });
  });

  it('shows an ok marker when no deadlines are due and compliance is clean', () => {
    const summary = buildDashboardFocusSummary({
      referenceDate: new Date('2026-05-22T10:00:00.000Z'),
      cases: [],
      deadlines: [{ status: 'open', dueAt: '2026-06-30T10:00:00.000Z' }],
      compliance: { ok: true, issueCount: 0 },
    });

    expect(summary.deadlines.marker).toBe('ok');
    expect(summary.compliance.marker).toBe('ok');
  });
});
