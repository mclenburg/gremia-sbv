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

  // Harte Produktregel: Das Dashboard zeigt nur Fristen, die überschritten sind
  // oder innerhalb der nächsten 48 Stunden fällig werden. Frühere Wiedervorlagen
  // bleiben in der Fristenliste, aber nicht auf der Arbeitsübersicht.
  if (hoursRemaining <= DASHBOARD_HOURS_BEFORE_DUE) return 'due_soon';

  return 'hidden';
}

export function getActionHint(deadline: DeadlineRecord): string {
  if (deadline.processType === 'termination_hearing') return 'Kündigungsvorgang sofort prüfen: Unterlagen, Integrationsamt, SBV-Stellungnahme.';
  if (deadline.processType === 'bem') return 'BEM-Schritt prüfen: Freiwilligkeit, Datenschutz, nächste Maßnahme dokumentieren.';
  if (deadline.processType === 'prevention') return 'Präventionsverfahren prüfen: Arbeitgeberreaktion und Einschaltung Inklusionsamt nachhalten.';
  if (deadline.processType === 'equalization') return 'Gleichstellungsverfahren prüfen: Nachweise, Sachstand und ggf. Widerspruchsfrist klären.';
  if (deadline.processType === 'gdb') return 'Bescheid/Zugang/Rechtsbehelfsbelehrung prüfen; ggf. Beratung oder Rechtsvertretung empfehlen.';
  if (deadline.sourceEvent === 'protected_person.status_expiry_warning' || deadline.sourceEvent === 'protected_person.status_expired_privacy_review') {
    return 'Statusnachweis im Personenverzeichnis prüfen: Status aktualisieren, Fortspeicherung begründen oder Datenschutzprüfung starten.';
  }
  return 'Nächsten Schritt im Fall prüfen und dokumentieren.';
}
