import type { PreventionProcessRecord, PreventionStatus, PreventionStepDefinition, PreventionWarning } from '../src/app/core/models/prevention.model.js';

export const PREVENTION_STEPS: PreventionStepDefinition[] = [
  {
    key: 'hazard',
    title: 'Gefährdung erfassen',
    objective: 'Dokumentiert wird, warum das Arbeitsverhältnis oder die behinderungsgerechte Beschäftigung erkennbar gefährdet sein könnte.'
  },
  {
    key: 'person_status',
    title: 'Status der Person klären',
    objective: 'Es wird festgehalten, ob Schwerbehinderung, Gleichstellung oder ein laufender Antrag bekannt ist; Diagnosen sind dafür nicht erforderlich.'
  },
  {
    key: 'difficulty',
    title: 'Schwierigkeit einordnen',
    objective: 'Die Schwierigkeit wird fachlich eingeordnet, damit der weitere Ablauf und die Beteiligten sauber bestimmt werden können.'
  },
  {
    key: 'employer_request',
    title: 'Arbeitgeber aktivieren',
    objective: 'Der Arbeitgeber soll frühzeitig und nachweisbar zur Durchführung des Präventionsverfahrens und zur Prüfung geeigneter Maßnahmen aufgefordert werden.'
  },
  {
    key: 'contacts',
    title: 'Beteiligte verknüpfen',
    objective: 'Relevante Stellen wie Inklusionsamt, Betriebsarzt, Betriebsrat oder externe Beratung werden am Verfahren dokumentiert.'
  },
  {
    key: 'integration_office',
    title: 'Inklusionsamt prüfen',
    objective: 'Bei erkennbarer Gefährdung ist zu prüfen, ob das Inklusionsamt eingeschaltet wurde oder durch die SBV nachgefasst werden muss.'
  },
  {
    key: 'measures',
    title: 'Maßnahmen dokumentieren',
    objective: 'Mögliche und vereinbarte Maßnahmen werden arbeitsplatzbezogen festgehalten, damit Umsetzung und Wirkung nachprüfbar bleiben.'
  },
  {
    key: 'review',
    title: 'Wiedervorlage setzen',
    objective: 'Das Verfahren darf nicht versanden; offene Reaktionen und Maßnahmen werden über Fristen und Wiedervorlagen nachgehalten.'
  },
  {
    key: 'completion',
    title: 'Abschluss bewerten',
    objective: 'Am Ende wird festgehalten, ob die Gefährdung beseitigt, vermindert, ungeklärt oder blockiert ist.'
  }
];

export function defaultEmployerResponseDueAt(requestedAt: string, days = 7): string {
  const date = new Date(requestedAt);
  if (Number.isNaN(date.getTime())) throw new Error('Ungültiges Anforderungsdatum.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function preventionReviewDueAtAfterEmployerDeadline(employerResponseDueAt: string, offsetDays = 1): string {
  const date = new Date(employerResponseDueAt);
  if (Number.isNaN(date.getTime())) throw new Error('Ungültige Frist für die Arbeitgeberreaktion.');
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

export function isOpenPreventionStatus(status: PreventionStatus): boolean {
  return status !== 'abgeschlossen';
}

export function evaluatePreventionWarnings(process: PreventionProcessRecord, referenceDate = new Date()): PreventionWarning[] {
  const warnings: PreventionWarning[] = [];

  if (!process.firstKnowledgeAt) {
    warnings.push({ level: 'warning', message: 'Datum der ersten Kenntnis fehlt. Ohne dieses Datum ist die Frühzeitigkeit schwer nachweisbar.' });
  }

  if (!process.requestedAt && process.status !== 'zu_pruefen') {
    warnings.push({ level: 'warning', message: 'Das Anforderungsdatum gegenüber dem Arbeitgeber fehlt.' });
  }

  if ((process.riskType === 'kuendigung' || process.riskType === 'arbeitsplatzverlust') && !process.integrationOfficeInvolvedAt) {
    warnings.push({ level: 'critical', message: 'Kündigungs- oder Arbeitsplatzverlustrisiko: Einschaltung des Inklusionsamts prüfen und dokumentieren.' });
  }

  if (process.status === 'blockiert_verweigert') {
    warnings.push({ level: 'critical', message: 'Verfahren ist blockiert/verweigert. Eskalation, Inklusionsamt oder rechtliche Klärung prüfen.' });
  }

  if (process.employerResponseDueAt && !process.employerRespondedAt && isOpenPreventionStatus(process.status)) {
    const hours = (new Date(process.employerResponseDueAt).getTime() - referenceDate.getTime()) / 3_600_000;
    if (hours < 0) {
      warnings.push({ level: 'critical', message: 'Die Frist für die Arbeitgeberreaktion ist überschritten.' });
    } else if (hours <= 48) {
      warnings.push({ level: 'warning', message: 'Die Frist für die Arbeitgeberreaktion läuft innerhalb von 48 Stunden ab.' });
    }
  }

  if (!process.nextReviewAt && isOpenPreventionStatus(process.status)) {
    warnings.push({ level: 'info', message: 'Für das laufende Präventionsverfahren ist keine Wiedervorlage gesetzt.' });
  }

  return warnings;
}

export function preventionStatusLabel(status: PreventionStatus): string {
  const labels: Record<PreventionStatus, string> = {
    zu_pruefen: 'zu prüfen',
    angefordert: 'angefordert',
    arbeitgeber_reagiert: 'Arbeitgeber reagiert',
    inklusionsamt_eingeschaltet: 'Inklusionsamt eingeschaltet',
    massnahmen_in_klaerung: 'Maßnahmen in Klärung',
    massnahmen_vereinbart: 'Maßnahmen vereinbart',
    abgeschlossen: 'abgeschlossen',
    blockiert_verweigert: 'blockiert / verweigert'
  };
  return labels[status];
}
