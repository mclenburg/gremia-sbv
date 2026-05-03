import type { BemProcessRecord, BemStatus, BemStepDefinition, BemWarning } from '../src/app/core/models/bem.model.js';

export const BEM_STEPS: BemStepDefinition[] = [
  {
    key: 'eligibility',
    title: 'BEM-Auslöser prüfen',
    objective: 'Geprüft wird, ob innerhalb von zwölf Monaten mehr als sechs Wochen Arbeitsunfähigkeit vorliegen oder ein präventiver Anlass dokumentiert ist.'
  },
  {
    key: 'offer',
    title: 'BEM-Angebot vorbereiten',
    objective: 'Das Angebot muss freiwillig, verständlich, datenschutzklar und ohne Druck erfolgen.'
  },
  {
    key: 'response',
    title: 'Reaktion dokumentieren',
    objective: 'Annahme, Ablehnung oder fehlende Reaktion werden nachvollziehbar festgehalten.'
  },
  {
    key: 'first_meeting',
    title: 'Erstgespräch planen',
    objective: 'Bei Annahme wird ein vertrauliches Erstgespräch mit gewählten Beteiligten vorbereitet.'
  },
  {
    key: 'analysis',
    title: 'Ursachen und Belastungen klären',
    objective: 'Arbeitsplatzbezug, Belastungen, Ressourcen und Unterstützungsbedarf werden so viel wie nötig und so wenig wie möglich dokumentiert.'
  },
  {
    key: 'measures',
    title: 'Maßnahmen vereinbaren',
    objective: 'Maßnahmen werden konkret, überprüfbar und mit Verantwortlichkeiten festgehalten.'
  },
  {
    key: 'review',
    title: 'Wirksamkeit prüfen',
    objective: 'Die Umsetzung darf nicht versanden; die Wirksamkeit wird über Wiedervorlagen nachgehalten.'
  },
  {
    key: 'completion',
    title: 'BEM abschließen',
    objective: 'Ergebnis, offene Punkte und Datenschutz-/Löschhinweise werden dokumentiert.'
  }
];

export const BEM_STATUS_ORDER: BemStatus[] = [
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

export function defaultBemResponseDueAt(offeredAt: string, days = 14): string {
  const date = new Date(offeredAt);
  if (Number.isNaN(date.getTime())) throw new Error('Ungültiges Angebotsdatum.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function isOpenBemStatus(status: BemStatus): boolean {
  return status !== 'abgeschlossen' && status !== 'abgelehnt' && status !== 'abgebrochen';
}

export function isDoneBemStatus(status: BemStatus): boolean {
  return status === 'abgeschlossen' || status === 'abgelehnt' || status === 'abgebrochen';
}

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

export function evaluateBemWarnings(process: BemProcessRecord, referenceDate = new Date()): BemWarning[] {
  const warnings: BemWarning[] = [];

  if (process.sicknessDaysTwelveMonths !== undefined && process.sicknessDaysTwelveMonths >= 42 && !process.bemOfferedAt) {
    warnings.push({ level: 'critical', message: 'BEM-Auslöser liegt vor: Angebot wurde noch nicht dokumentiert.' });
  }

  if (process.status === 'angebot_versendet' && !process.responseDueAt) {
    warnings.push({ level: 'warning', message: 'BEM-Angebot versendet, aber keine Frist für die Reaktion dokumentiert.' });
  }

  if (process.responseDueAt && process.employeeResponse === 'offen' && isOpenBemStatus(process.status)) {
    const hours = (new Date(process.responseDueAt).getTime() - referenceDate.getTime()) / 3_600_000;
    if (hours < 0) {
      warnings.push({ level: 'critical', message: 'Die Reaktionsfrist auf das BEM-Angebot ist überschritten.' });
    } else if (hours <= 48) {
      warnings.push({ level: 'warning', message: 'Die Reaktionsfrist auf das BEM-Angebot läuft innerhalb von 48 Stunden ab.' });
    }
  }

  if (process.employeeResponse === 'angenommen' && !process.firstMeetingAt && isOpenBemStatus(process.status)) {
    warnings.push({ level: 'info', message: 'BEM angenommen: Erstgespräch ist noch nicht geplant.' });
  }

  if ((process.status === 'massnahmen_vereinbart' || process.status === 'wirksamkeit_pruefen') && !process.nextReviewAt) {
    warnings.push({ level: 'warning', message: 'Für vereinbarte BEM-Maßnahmen fehlt eine Wirksamkeitsprüfung/Wiedervorlage.' });
  }

  if (process.confidentialNotes && process.confidentialNotes.length > 0) {
    warnings.push({ level: 'info', message: 'Vertrauliche BEM-Notizen vorhanden: Export und Weitergabe besonders prüfen.' });
  }

  return warnings;
}
