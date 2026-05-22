export type DashboardCaseLike = {
  status?: string | null;
};

export type DashboardDeadlineLike = {
  status?: string | null;
  severity?: string | null;
  dueAt?: string | null;
  due_at?: string | null;
  isOverdue?: boolean | null;
};

export type DashboardComplianceLike = {
  ok?: boolean | null;
  issueCount?: number | null;
  issues?: unknown[] | null;
  repairRequired?: boolean | null;
};

export type DashboardFocusMarker = 'neutral' | 'attention' | 'warning' | 'ok';

export type DashboardFocusSummary = {
  cases: {
    total: number;
    open: number;
    marker: DashboardFocusMarker;
  };
  deadlines: {
    totalOpen: number;
    dueSoon: number;
    overdue: number;
    marker: DashboardFocusMarker;
  };
  compliance: {
    ok: boolean;
    warnings: number;
    marker: DashboardFocusMarker;
  };
};

const CLOSED_CASE_STATES = new Set(['closed', 'archived', 'deleted']);
const OPEN_DEADLINE_STATES = new Set(['open', 'due', 'overdue']);
const OVERDUE_DEADLINE_STATES = new Set(['overdue']);
const WARNING_DEADLINE_SEVERITIES = new Set(['warning', 'critical']);

function normalized(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function dueDateOf(deadline: DashboardDeadlineLike): Date | null {
  const value = deadline.dueAt ?? deadline.due_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOpenCase(record: DashboardCaseLike): boolean {
  const status = normalized(record.status);
  return !status || !CLOSED_CASE_STATES.has(status);
}

function isOpenDeadline(deadline: DashboardDeadlineLike): boolean {
  const status = normalized(deadline.status);
  return !status || OPEN_DEADLINE_STATES.has(status);
}

function isOverdueDeadline(deadline: DashboardDeadlineLike, referenceDate: Date): boolean {
  if (deadline.isOverdue) return true;
  if (OVERDUE_DEADLINE_STATES.has(normalized(deadline.status))) return true;
  const due = dueDateOf(deadline);
  return Boolean(due && due.getTime() < referenceDate.getTime() && isOpenDeadline(deadline));
}

function isDueSoonDeadline(deadline: DashboardDeadlineLike, referenceDate: Date): boolean {
  if (!isOpenDeadline(deadline) || isOverdueDeadline(deadline, referenceDate)) return false;
  if (WARNING_DEADLINE_SEVERITIES.has(normalized(deadline.severity))) return true;
  const due = dueDateOf(deadline);
  if (!due) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return due.getTime() - referenceDate.getTime() <= sevenDaysMs;
}

export function buildDashboardFocusSummary(input: {
  cases: readonly DashboardCaseLike[];
  deadlines: readonly DashboardDeadlineLike[];
  compliance?: DashboardComplianceLike | null;
  referenceDate?: Date;
}): DashboardFocusSummary {
  const referenceDate = input.referenceDate ?? new Date();
  const openCases = input.cases.filter(isOpenCase).length;
  const openDeadlines = input.deadlines.filter(isOpenDeadline);
  const overdue = openDeadlines.filter((deadline) => isOverdueDeadline(deadline, referenceDate)).length;
  const dueSoon = openDeadlines.filter((deadline) => isDueSoonDeadline(deadline, referenceDate)).length;
  const complianceWarnings = Number(input.compliance?.issueCount ?? input.compliance?.issues?.length ?? 0);
  const complianceOk = input.compliance?.ok !== false && !input.compliance?.repairRequired && complianceWarnings === 0;

  return {
    cases: {
      total: input.cases.length,
      open: openCases,
      marker: openCases > 0 ? 'attention' : 'neutral',
    },
    deadlines: {
      totalOpen: openDeadlines.length,
      dueSoon,
      overdue,
      marker: overdue > 0 ? 'warning' : dueSoon > 0 ? 'attention' : 'ok',
    },
    compliance: {
      ok: complianceOk,
      warnings: complianceWarnings,
      marker: complianceOk ? 'ok' : 'warning',
    },
  };
}
