import type { DeadlineListFilters, DeadlineRecord } from '../../core/models/deadline.model';
import { getDashboardState } from '../../core/deadlineLogic';
import type { DeadlineExportScope } from './deadlineLabels';

export type DeadlineWorkSummary = {
  overdueCount: number;
  dueSoonCount: number;
  criticalCount: number;
  openCount: number;
  freeFollowUpCount: number;
};

export function resolveDeadlineWorkSummary(deadlines: DeadlineRecord[], referenceDate = new Date()): DeadlineWorkSummary {
  return deadlines.reduce<DeadlineWorkSummary>((summary, deadline) => {
    const state = getDashboardState(deadline, referenceDate);
    if (deadline.status === 'open' || deadline.status === 'overdue') summary.openCount += 1;
    if (state === 'overdue') summary.overdueCount += 1;
    if (state === 'due_soon') summary.dueSoonCount += 1;
    if (state === 'critical') summary.criticalCount += 1;
    if ((deadline.processType === 'custom' || deadline.processType === 'sbv_control_protocol') && deadline.deadlineType === 'follow_up' && !deadline.caseId) summary.freeFollowUpCount += 1;
    return summary;
  }, {
    overdueCount: 0,
    dueSoonCount: 0,
    criticalCount: 0,
    openCount: 0,
    freeFollowUpCount: 0,
  });
}

export function filtersForDeadlineExportScope(scope: DeadlineExportScope): DeadlineListFilters {
  if (scope === 'all') return {};
  if (scope === 'dashboard') return { status: ['open', 'overdue'], dashboardOnly: true };
  return { status: ['open', 'overdue'] };
}
