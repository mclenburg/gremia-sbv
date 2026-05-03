import type { BemStatus } from '../../core/models/bem.model';

export const BEM_OVERVIEW_STATUS_ORDER: BemStatus[] = [
  'zu_pruefen',
  'angebot_vorzubereiten',
  'angebot_versendet',
  'reaktion_abwarten',
  'angenommen',
  'gespraech_geplant',
  'massnahmen_in_klaerung',
  'massnahmen_vereinbart',
  'wirksamkeit_pruefen',
  'abgelehnt',
  'abgebrochen',
  'abgeschlossen'
];

export const bemStatusOrder: BemStatus[] = BEM_OVERVIEW_STATUS_ORDER;

export function bemStatusLabel(status: BemStatus): string {
  const labels: Record<BemStatus, string> = {
    zu_pruefen: 'zu prüfen',
    angebot_vorzubereiten: 'Angebot vorzubereiten',
    angebot_versendet: 'Angebot versendet',
    reaktion_abwarten: 'Reaktion abwarten',
    angenommen: 'angenommen',
    abgelehnt: 'abgelehnt',
    gespraech_geplant: 'Gespräch geplant',
    massnahmen_in_klaerung: 'Maßnahmen in Klärung',
    massnahmen_vereinbart: 'Maßnahmen vereinbart',
    wirksamkeit_pruefen: 'Wirksamkeit prüfen',
    abgeschlossen: 'abgeschlossen',
    abgebrochen: 'abgebrochen'
  };
  return labels[status] ?? status;
}

export function isDoneBemStatus(status: BemStatus): boolean {
  return status === 'abgeschlossen' || status === 'abgelehnt' || status === 'abgebrochen';
}

export function bemStatusReached(current: BemStatus, target: BemStatus): boolean {
  return BEM_OVERVIEW_STATUS_ORDER.indexOf(current) >= BEM_OVERVIEW_STATUS_ORDER.indexOf(target);
}
