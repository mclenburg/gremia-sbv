import type { DeadlineDashboardState, DeadlineRecord } from './models/deadline.model';

export const DASHBOARD_HOURS_BEFORE_DUE = 48;

export function getHoursRemaining(dueAt: string, referenceDate = new Date()): number {
  return (new Date(dueAt).getTime() - referenceDate.getTime()) / (1000 * 60 * 60);
}

export function getDashboardState(deadline: DeadlineRecord, referenceDate = new Date()): DeadlineDashboardState {
  if (deadline.status === 'done' || deadline.status === 'cancelled' || deadline.status === 'suspended') return 'hidden';

  const hoursRemaining = getHoursRemaining(deadline.dueAt, referenceDate);
  if (hoursRemaining < 0 || deadline.status === 'overdue') return 'overdue';
  if (hoursRemaining <= deadline.criticalThresholdHours) return 'critical';

  // Harte Produktregel: Ab 48h vor Ablaufdatum muss die Frist auf dem Dashboard auftauchen.
  if (hoursRemaining <= DASHBOARD_HOURS_BEFORE_DUE) return 'due_soon';

  const dashboardFrom = deadline.dashboardFromAt ? new Date(deadline.dashboardFromAt) : undefined;
  if (dashboardFrom && referenceDate >= dashboardFrom) return 'upcoming';

  return 'hidden';
}

export function getActionHint(deadline: DeadlineRecord): string {
  if (deadline.processType === 'termination_hearing') return 'Kündigungsvorgang sofort prüfen: Unterlagen, Integrationsamt, SBV-Stellungnahme.';
  if (deadline.processType === 'bem') return 'BEM-Schritt prüfen: Freiwilligkeit, Datenschutz, nächste Maßnahme dokumentieren.';
  if (deadline.processType === 'prevention') return 'Präventionsverfahren prüfen: Arbeitgeberreaktion und Einschaltung Inklusionsamt nachhalten.';
  if (deadline.processType === 'equalization') return 'Gleichstellungsverfahren prüfen: Nachweise, Sachstand und ggf. Widerspruchsfrist klären.';
  if (deadline.processType === 'gdb') return 'Bescheid/Zugang/Rechtsbehelfsbelehrung prüfen; ggf. Beratung oder Rechtsvertretung empfehlen.';
  return 'Nächsten Schritt im Fall prüfen und dokumentieren.';
}
