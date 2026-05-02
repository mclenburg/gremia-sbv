import { describe, expect, it } from 'vitest';
import { getDashboardState } from '../services/deadlineService';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';

function baseDeadline(overrides: Partial<DeadlineRecord> = {}): DeadlineRecord {
  return {
    id: 'd1',
    processType: 'case',
    deadlineType: 'follow_up',
    title: 'Offene Aufgabe',
    dueAt: '9999-12-31T23:59:59.000Z',
    severity: 'important',
    status: 'open',
    calculationMode: 'manual',
    isLegalDeadline: false,
    isUserEditable: true,
    warningThresholdHours: 999999,
    criticalThresholdHours: 999998,
    dashboardFromAt: '2026-05-02T10:00:00.000Z',
    createdAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    ...overrides
  };
}

describe('open task dashboard policy', () => {
  it('zeigt offene Aufgaben ohne konkretes Datum auf dem Dashboard an, wenn dashboard_from_at erreicht ist', () => {
    expect(getDashboardState(baseDeadline(), new Date('2026-05-02T11:00:00.000Z'))).toBe('upcoming');
  });
});
