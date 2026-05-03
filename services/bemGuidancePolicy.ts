import type { BemProcessRecord, BemStatus } from '../src/app/core/models/bem.model.js';
import { evaluateBemWarnings } from './bemWorkflowPolicy.js';

export type BemGuidanceLevel = 'info' | 'warning' | 'critical';

export interface BemGuidanceItem {
  id: string;
  level: BemGuidanceLevel;
  text: string;
  field?: keyof BemProcessRecord;
}

export interface BemStatusGuidance {
  status: BemStatus;
  title: string;
  objective: string;
  required: BemGuidanceItem[];
  suggestedNextStatus?: BemStatus;
}

export function bemStatusObjective(status: BemStatus): string {
  const objectives: Record<BemStatus, string> = {
    zu_pruefen: 'BEM-Auslöser prüfen und Anlass sauber dokumentieren.',
    angebot_vorzubereiten: 'BEM-Angebot vorbereiten: freiwillig, verständlich und datenschutzklar.',
    angebot_versendet: 'BEM-Angebot ist versendet; Reaktion und Frist nachhalten.',
    reaktion_abwarten: 'Reaktion der betroffenen Person dokumentieren, ohne Druck aufzubauen.',
    angenommen: 'Einwilligung, Datenschutz und Erstgespräch vorbereiten.',
    abgelehnt: 'Ablehnung respektieren und Abschluss knapp dokumentieren.',
    gespraech_geplant: 'Erstgespräch mit gewünschtem Beteiligtenkreis vorbereiten.',
    massnahmen_in_klaerung: 'Arbeitsplatzbezogene Ursachen und geeignete Maßnahmen klären.',
    massnahmen_vereinbart: 'Maßnahmenplan mit Verantwortlichen und Wirksamkeitsprüfung absichern.',
    wirksamkeit_pruefen: 'Umsetzung und Wirkung der vereinbarten Maßnahmen prüfen.',
    abgeschlossen: 'BEM mit Ergebnis, Abschlussgrund und Aufbewahrungshinweis schließen.',
    abgebrochen: 'Abbruchgrund dokumentieren und weitere Unterstützungsoptionen prüfen.'
  };
  return objectives[status];
}

export function suggestNextBemStatus(process: BemProcessRecord): BemStatus | undefined {
  if (process.status === 'zu_pruefen' && process.triggerDescription) return 'angebot_vorzubereiten';
  if (process.status === 'angebot_vorzubereiten' && process.bemOfferedAt) return 'angebot_versendet';
  if (process.status === 'angebot_versendet' && process.responseDueAt) return 'reaktion_abwarten';
  if (process.status === 'reaktion_abwarten' && process.employeeResponse === 'angenommen') return 'angenommen';
  if (process.status === 'angenommen' && process.privacyNoticeAt && process.consentScope) return 'gespraech_geplant';
  if (process.status === 'gespraech_geplant' && process.firstMeetingAt) return 'massnahmen_in_klaerung';
  if (process.status === 'massnahmen_in_klaerung' && process.measures) return 'massnahmen_vereinbart';
  if (process.status === 'massnahmen_vereinbart' && process.nextReviewAt) return 'wirksamkeit_pruefen';
  if (process.status === 'wirksamkeit_pruefen' && process.result) return 'abgeschlossen';
  return undefined;
}

function missing(process: BemProcessRecord, field: keyof BemProcessRecord): boolean {
  const value = process[field];
  return value === undefined || value === null || value === '';
}

export function buildBemStatusGuidance(process: BemProcessRecord): BemStatusGuidance {
  const required: BemGuidanceItem[] = evaluateBemWarnings(process).map((warning, index) => ({
    id: `warning-${index}`,
    level: warning.level,
    text: warning.message
  }));

  const requireField = (field: keyof BemProcessRecord, text: string, level: BemGuidanceLevel = 'warning') => {
    if (missing(process, field)) required.push({ id: `missing-${String(field)}`, level, field, text });
  };

  if (process.status === 'zu_pruefen') {
    requireField('triggerDescription', 'Anlass/Auslöser fehlt. Ohne Anlass ist das BEM-Verfahren fachlich nicht einordnungsfähig.');
  }

  if (process.status === 'angebot_vorzubereiten' || process.status === 'angebot_versendet' || process.status === 'reaktion_abwarten') {
    requireField('bemOfferedAt', 'BEM-Angebot ist noch nicht datiert.');
    requireField('responseDueAt', 'Reaktionsfrist für das BEM-Angebot fehlt.');
  }

  if (process.employeeResponse === 'angenommen' || process.status === 'angenommen' || process.status === 'gespraech_geplant') {
    requireField('privacyNoticeAt', 'Datenschutzhinweis ist noch nicht dokumentiert.');
    requireField('consentScope', 'Einwilligungsumfang und Beteiligte sind noch nicht beschrieben.');
  }

  if (process.status === 'gespraech_geplant') {
    requireField('firstMeetingAt', 'Termin des Erstgesprächs fehlt.');
  }

  if (process.status === 'massnahmen_in_klaerung' || process.status === 'massnahmen_vereinbart' || process.status === 'wirksamkeit_pruefen') {
    requireField('measures', 'Maßnahmenplan fehlt.');
    requireField('measureOwners', 'Verantwortliche/Umsetzung fehlen.');
    requireField('nextReviewAt', 'Termin zur Wirksamkeitsprüfung fehlt.');
  }

  if (process.status === 'abgeschlossen' || process.status === 'abgebrochen' || process.status === 'abgelehnt') {
    requireField('completionReason', 'Abschluss- oder Abbruchgrund fehlt.');
    requireField('dataRetentionNote', 'Aufbewahrungs-/Löschhinweis fehlt.', 'info');
  }

  return {
    status: process.status,
    title: 'BEM-Statusführung',
    objective: bemStatusObjective(process.status),
    required,
    suggestedNextStatus: suggestNextBemStatus(process)
  };
}
