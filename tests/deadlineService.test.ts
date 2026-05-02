import { describe, expect, it } from 'vitest';
import { getDashboardState, getHoursRemaining } from '../src/app/core/deadlineLogic';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';

function deadline(hoursFromNow: number, overrides: Partial<DeadlineRecord> = {}): DeadlineRecord {
  const reference = new Date('2026-05-02T10:00:00.000Z');
  const due = new Date(reference);
  due.setUTCHours(due.getUTCHours() + hoursFromNow);
  return {
    id: `d-${hoursFromNow}`,
    processType: 'case',
    deadlineType: 'follow_up',
    title: 'Testfrist',
    dueAt: due.toISOString(),
    severity: 'normal',
    status: 'open',
    calculationMode: 'manual',
    isLegalDeadline: false,
    isUserEditable: true,
    warningThresholdHours: 48,
    criticalThresholdHours: 24,
    createdAt: reference.toISOString(),
    updatedAt: reference.toISOString(),
    ...overrides
  };
}

const reference = new Date('2026-05-02T10:00:00.000Z');

describe('Deadline dashboard logic', () => {
  it('shows every open deadline from 48 hours before due date', () => {
    expect(getDashboardState(deadline(48), reference)).toBe('due_soon');
    expect(getDashboardState(deadline(47.5), reference)).toBe('due_soon');
  });

  it('keeps deadlines outside the 48 hour window hidden unless dashboardFromAt is reached', () => {
    expect(getDashboardState(deadline(49), reference)).toBe('hidden');
  });

  it('marks deadlines inside the critical threshold as critical', () => {
    expect(getDashboardState(deadline(24), reference)).toBe('critical');
    expect(getDashboardState(deadline(2, { processType: 'termination_hearing', severity: 'fatal' }), reference)).toBe('critical');
  });

  it('marks overdue deadlines as overdue', () => {
    expect(getDashboardState(deadline(-1), reference)).toBe('overdue');
  });

  it('does not show completed or cancelled deadlines', () => {
    expect(getDashboardState(deadline(1, { status: 'done' }), reference)).toBe('hidden');
    expect(getDashboardState(deadline(1, { status: 'cancelled' }), reference)).toBe('hidden');
  });

  it('calculates remaining hours', () => {
    expect(Math.round(getHoursRemaining(deadline(36).dueAt, reference))).toBe(36);
  });
});
