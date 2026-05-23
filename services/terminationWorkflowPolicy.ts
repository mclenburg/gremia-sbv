import type { TerminationHearingRecord, TerminationHearingStatus, TerminationHearingWarning, TerminationType } from '../src/app/core/models/termination.model.js';

export const TERMINATION_STATUS_ORDER: TerminationHearingStatus[] = [
  'eingang',
  'unterlagen_pruefen',
  'sbv_anhoerung_offen',
  'integrationsamt_pruefen',
  'stellungnahme_in_arbeit',
  'stellungnahme_abgegeben',
  'abgeschlossen'
];

const PROTECTED_STATUSES = ['schwerbehindert', 'gleichgestellt', 'antrag_laeuft'] as const;
type ProtectedTerminationStatus = (typeof PROTECTED_STATUSES)[number];

function isProtectedTerminationStatus(status: TerminationHearingRecord['protectionStatus']): status is ProtectedTerminationStatus {
  return PROTECTED_STATUSES.some((protectedStatus) => protectedStatus === status);
}

export function terminationStatusLabel(status: TerminationHearingStatus): string {
  const labels: Record<TerminationHearingStatus, string> = {
    eingang: 'Eingang',
    unterlagen_pruefen: 'Unterlagen prüfen',
    sbv_anhoerung_offen: 'SBV-Anhörung offen',
    integrationsamt_pruefen: 'Integrationsamt prüfen',
    stellungnahme_in_arbeit: 'Stellungnahme in Arbeit',
    stellungnahme_abgegeben: 'Stellungnahme abgegeben',
    abgeschlossen: 'abgeschlossen'
  };
  return labels[status];
}

export function terminationStatusObjective(status: TerminationHearingStatus): string {
  const objectives: Record<TerminationHearingStatus, string> = {
    eingang: 'Eingang, Fristen und Schutzstatus sofort klären. Keine Stellungnahme ohne nachvollziehbare Unterrichtung.',
    unterlagen_pruefen: 'Vollständigkeit der Arbeitgeberunterlagen prüfen und fehlende Informationen konkret nachfordern.',
    sbv_anhoerung_offen: 'Unterrichtung und Anhörung der SBV nach § 178 Abs. 2 Satz 1 SGB IX absichern.',
    integrationsamt_pruefen: 'Erfordernis der Zustimmung des Integrationsamts nach §§ 168 ff. SGB IX prüfen und dokumentieren.',
    stellungnahme_in_arbeit: 'SBV-Stellungnahme rechtzeitig, konkret und fallbezogen vorbereiten.',
    stellungnahme_abgegeben: 'Abgabe dokumentieren und weitere Schritte nachhalten.',
    abgeschlossen: 'Vorgang mit Ergebnis, Fristenlage und Dokumentation schließen.'
  };
  return objectives[status];
}

export function isDoneTerminationStatus(status: TerminationHearingStatus): boolean {
  return status === 'abgeschlossen';
}

export function hasPotentialSpecialDismissalProtection(process: TerminationHearingRecord): boolean {
  return isProtectedTerminationStatus(process.protectionStatus);
}

export function isExtraordinaryTermination(type: TerminationType): boolean {
  return type === 'ausserordentlich' || type === 'verdachtskuendigung';
}

export function suggestedStatementDueAt(receivedAt: string | undefined, terminationType: TerminationType): string | undefined {
  if (!receivedAt) return undefined;
  const received = new Date(receivedAt);
  if (Number.isNaN(received.getTime())) return undefined;
  const due = new Date(received.getTime());
  due.setDate(due.getDate() + (isExtraordinaryTermination(terminationType) ? 3 : 7));
  return due.toISOString();
}

function isPast(value?: string): boolean {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function isNear(value?: string, hours = 24): boolean {
  if (!value) return false;
  const diff = new Date(value).getTime() - Date.now();
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

export function evaluateTerminationWarnings(process: TerminationHearingRecord): TerminationHearingWarning[] {
  const warnings: TerminationHearingWarning[] = [];

  if (!process.receivedAt) {
    warnings.push({ level: 'critical', message: 'Eingangsdatum der Kündigungsanhörung fehlt.' });
  }

  if (process.protectionStatus === 'unklar' || process.protectionStatus === 'nicht_bekannt') {
    warnings.push({ level: 'critical', message: 'Schutzstatus ist nicht geklärt. Schwerbehinderung, Gleichstellung oder laufender Antrag müssen vor Bewertung geprüft werden.' });
  }

  if (!process.sbvStatementDueAt) {
    warnings.push({ level: 'critical', message: 'SBV-Stellungnahmefrist fehlt.' });
  }

  if (isPast(process.sbvStatementDueAt) && process.status !== 'stellungnahme_abgegeben' && process.status !== 'abgeschlossen') {
    warnings.push({ level: 'critical', message: 'SBV-Stellungnahmefrist ist überschritten.' });
  } else if (isNear(process.sbvStatementDueAt, 24) && process.status !== 'stellungnahme_abgegeben' && process.status !== 'abgeschlossen') {
    warnings.push({ level: 'warning', message: 'SBV-Stellungnahmefrist läuft innerhalb der nächsten 24 Stunden ab.' });
  }

  if (hasPotentialSpecialDismissalProtection(process)) {
    if (!process.integrationOfficeRequestedAt && !process.integrationOfficeDecisionAt) {
      warnings.push({ level: 'critical', message: 'Besonderer Kündigungsschutz prüfen: Zustimmung des Integrationsamts ist nicht dokumentiert.' });
    }
  }

  if (!process.employerReason) {
    warnings.push({ level: 'warning', message: 'Kündigungsgrund / Arbeitgebervortrag fehlt.' });
  }

  if (!process.missingInformation && process.status === 'unterlagen_pruefen') {
    warnings.push({ level: 'info', message: 'Bei unvollständigen Unterlagen fehlende Informationen ausdrücklich dokumentieren.' });
  }

  if (process.status === 'stellungnahme_in_arbeit' && !process.statement) {
    warnings.push({ level: 'warning', message: 'Status steht auf Stellungnahme in Arbeit, aber der Stellungnahmetext fehlt.' });
  }

  return warnings;
}

export function suggestNextTerminationStatus(process: TerminationHearingRecord): TerminationHearingStatus | undefined {
  if (process.status === 'eingang' && process.receivedAt) return 'unterlagen_pruefen';
  if (process.status === 'unterlagen_pruefen' && process.employerReason) return 'sbv_anhoerung_offen';
  if (process.status === 'sbv_anhoerung_offen' && hasPotentialSpecialDismissalProtection(process)) return 'integrationsamt_pruefen';
  if ((process.status === 'sbv_anhoerung_offen' || process.status === 'integrationsamt_pruefen') && process.sbvAssessment) return 'stellungnahme_in_arbeit';
  if (process.status === 'stellungnahme_in_arbeit' && process.statement) return 'stellungnahme_abgegeben';
  if (process.status === 'stellungnahme_abgegeben') return 'abgeschlossen';
  return undefined;
}
