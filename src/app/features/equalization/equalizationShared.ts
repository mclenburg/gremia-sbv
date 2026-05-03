import type { EqualizationStatus } from '../../core/models/equalization.model';

export const equalizationStatusOrder: EqualizationStatus[] = ['beratung', 'vorbereitung', 'eingereicht', 'nachfrage', 'bewilligt', 'abgelehnt', 'widerspruch', 'abgeschlossen'];

export function equalizationStatusLabel(status: EqualizationStatus): string {
  const labels: Record<EqualizationStatus, string> = {
    beratung: 'Beratung',
    vorbereitung: 'Antrag vorbereiten',
    eingereicht: 'Antrag eingereicht',
    nachfrage: 'Nachfrage / Unterlagen',
    bewilligt: 'bewilligt',
    abgelehnt: 'abgelehnt',
    widerspruch: 'Widerspruch',
    abgeschlossen: 'abgeschlossen'
  };
  return labels[status];
}

export function isDoneEqualizationStatus(status: EqualizationStatus): boolean {
  return status === 'bewilligt' || status === 'abgeschlossen';
}
