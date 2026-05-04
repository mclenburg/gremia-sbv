import type { TerminationHearingStatus, TerminationType, DisabilityProtectionStatus } from '../../core/models/termination.model';

export const terminationStatusOrder: TerminationHearingStatus[] = [
  'eingang',
  'unterlagen_pruefen',
  'sbv_anhoerung_offen',
  'integrationsamt_pruefen',
  'stellungnahme_in_arbeit',
  'stellungnahme_abgegeben',
  'abgeschlossen'
];

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

export function terminationTypeLabel(type: TerminationType): string {
  const labels: Record<TerminationType, string> = {
    ordentlich: 'ordentlich',
    ausserordentlich: 'außerordentlich',
    aenderungskuendigung: 'Änderungskündigung',
    verdachtskuendigung: 'Verdachtskündigung',
    personenbedingt: 'personenbedingt',
    verhaltensbedingt: 'verhaltensbedingt',
    betriebsbedingt: 'betriebsbedingt',
    sonstiges: 'sonstiges'
  };
  return labels[type];
}

export function protectionStatusLabel(status: DisabilityProtectionStatus): string {
  const labels: Record<DisabilityProtectionStatus, string> = {
    schwerbehindert: 'schwerbehindert',
    gleichgestellt: 'gleichgestellt',
    antrag_laeuft: 'Antrag läuft',
    unklar: 'unklar',
    nicht_bekannt: 'nicht bekannt'
  };
  return labels[status];
}

export function isDoneTerminationStatus(status: TerminationHearingStatus): boolean {
  return status === 'abgeschlossen';
}
