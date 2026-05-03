import type { PreventionStatus } from '../../core/models/prevention.model';

export const PREVENTION_OVERVIEW_STATUS_ORDER: PreventionStatus[] = [
  'zu_pruefen',
  'angefordert',
  'arbeitgeber_reagiert',
  'inklusionsamt_eingeschaltet',
  'massnahmen_in_klaerung',
  'massnahmen_vereinbart',
  'blockiert_verweigert',
  'abgeschlossen'
];

export const preventionStatusOrder: PreventionStatus[] = PREVENTION_OVERVIEW_STATUS_ORDER;

export function statusLabel(status: PreventionStatus): string {
  const labels: Record<PreventionStatus, string> = {
    zu_pruefen: 'zu prüfen',
    angefordert: 'angefordert',
    arbeitgeber_reagiert: 'Arbeitgeber reagiert',
    inklusionsamt_eingeschaltet: 'Inklusionsamt eingeschaltet',
    massnahmen_in_klaerung: 'Maßnahmen in Klärung',
    massnahmen_vereinbart: 'Maßnahmen vereinbart',
    blockiert_verweigert: 'blockiert / verweigert',
    abgeschlossen: 'abgeschlossen'
  };
  return labels[status] ?? status;
}

export function isDonePreventionStatus(status: PreventionStatus): boolean {
  return status === 'abgeschlossen';
}
