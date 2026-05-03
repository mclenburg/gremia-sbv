import type { EqualizationProcessRecord, EqualizationWarning } from '../src/app/core/models/equalization.model.js';

export const EQUALIZATION_STATUS_ORDER = ['beratung', 'vorbereitung', 'eingereicht', 'nachfrage', 'bewilligt', 'abgelehnt', 'widerspruch', 'abgeschlossen'] as const;

export function equalizationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    beratung: 'Beratung',
    vorbereitung: 'Antrag vorbereiten',
    eingereicht: 'Antrag eingereicht',
    nachfrage: 'Nachfrage / Unterlagen',
    bewilligt: 'bewilligt',
    abgelehnt: 'abgelehnt',
    widerspruch: 'Widerspruch',
    abgeschlossen: 'abgeschlossen'
  };
  return labels[status] ?? status;
}

export function isDoneEqualizationStatus(status: string): boolean {
  return status === 'bewilligt' || status === 'abgeschlossen';
}

export function evaluateEqualizationWarnings(process: EqualizationProcessRecord): EqualizationWarning[] {
  const warnings: EqualizationWarning[] = [];
  if ((process.applicationStatus === 'eingereicht' || process.applicationStatus === 'nachfrage') && !process.agencyReference) {
    warnings.push({ level: 'info', message: 'Aktenzeichen / Geschäftszeichen der Agentur für Arbeit fehlt.' });
  }
  if ((process.applicationStatus === 'eingereicht' || process.applicationStatus === 'nachfrage') && !process.applicationSubmittedAt) {
    warnings.push({ level: 'warning', message: 'Einreichungsdatum des Gleichstellungsantrags fehlt.' });
  }
  if ((process.applicationStatus === 'abgelehnt' || process.applicationStatus === 'widerspruch') && !process.objectionDueAt) {
    warnings.push({ level: 'critical', message: 'Ablehnung dokumentiert, aber Widerspruchsfrist fehlt.' });
  }
  if (process.applicationStatus === 'widerspruch' && !process.notes) {
    warnings.push({ level: 'warning', message: 'Widerspruch läuft: Begründung / nächste Schritte fehlen.' });
  }
  return warnings;
}
