import type { DeadlineDashboardState, DeadlineSeverity } from '../../core/models/deadline.model';

const stateLabels: Record<DeadlineDashboardState, string> = {
  hidden: 'Ausgeblendet',
  upcoming: 'Dashboard',
  due_soon: '≤ 48h',
  critical: 'Kritisch',
  overdue: 'Überfällig'
};

const severityLabels: Record<DeadlineSeverity, string> = {
  normal: 'Normal',
  important: 'Wichtig',
  critical: 'Dringend',
  fatal: 'Kritisch'
};

const stateClass: Record<DeadlineDashboardState, string> = {
  hidden: 'industrial-status-muted',
  upcoming: 'industrial-status-neutral',
  due_soon: 'industrial-status-warning',
  critical: 'industrial-status-danger',
  overdue: 'industrial-status-fatal'
};

const severityClass: Record<DeadlineSeverity, string> = {
  normal: 'industrial-status-muted',
  important: 'industrial-status-warning',
  critical: 'industrial-status-danger',
  fatal: 'industrial-status-fatal'
};

export function DeadlineStateBadge({ state }: { state: DeadlineDashboardState }) {
  return <span className={`industrial-status-badge ${stateClass[state]}`}>{stateLabels[state]}</span>;
}

export function DeadlineSeverityBadge({ severity }: { severity: DeadlineSeverity }) {
  return <span className={`industrial-status-badge ${severityClass[severity]}`}>{severityLabels[severity]}</span>;
}
