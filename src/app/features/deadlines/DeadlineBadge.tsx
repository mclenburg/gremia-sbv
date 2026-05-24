import type {
  DeadlineDashboardState,
  DeadlineSeverity,
} from '../../core/models/deadline.model';
import { DeadlineBadge, RiskBadge } from '../../shared/components/StatusBadges';

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

export function DeadlineStateBadge({ state }: { state: DeadlineDashboardState }) {
  return <DeadlineBadge state={state} label={stateLabels[state]} ariaLabel={`Fristenstatus ${stateLabels[state]}`} />;
}

export function DeadlineSeverityBadge({ severity }: { severity: DeadlineSeverity }) {
  return <RiskBadge risk={severity} label={severityLabels[severity]} ariaLabel={`Fristenpriorität ${severityLabels[severity]}`} />;
}
