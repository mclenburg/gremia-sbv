import type { EqualizationProcessRecord, EqualizationStatus, EqualizationWarning } from '../src/app/core/models/equalization.model.js';
import { evaluateEqualizationWarnings } from './equalizationWorkflowPolicy.js';

export interface EqualizationGuidance {
  title: string;
  objective: string;
  warnings: EqualizationWarning[];
  suggestedNextStatus?: EqualizationStatus;
}

export function equalizationStatusObjective(status: EqualizationStatus): string {
  const objectives: Record<EqualizationStatus, string> = {
    beratung: 'Klärung, ob Gleichstellung, GdB-Antrag oder Widerspruch fachlich sinnvoll begleitet werden soll.',
    vorbereitung: 'Antrag und betriebliche Begründung vorbereiten.',
    eingereicht: 'Antragseinreichung, Geschäftszeichen und Rückmeldungen der Agentur für Arbeit nachhalten.',
    nachfrage: 'Nachforderungen prüfen und fehlende Unterlagen fristgerecht koordinieren.',
    bewilligt: 'Bewilligung dokumentieren und betriebliche Schutz-/Unterstützungsfolgen prüfen.',
    abgelehnt: 'Bescheidzugang und Widerspruchsfrist sichern.',
    widerspruch: 'Widerspruchsbegründung und nächste Schritte koordinieren.',
    abgeschlossen: 'Verfahren mit Ergebnis und offener Unterstützungsfolge abschließen.'
  };
  return objectives[status];
}

export function suggestNextEqualizationStatus(process: EqualizationProcessRecord): EqualizationStatus | undefined {
  if (process.applicationStatus === 'beratung' && process.notes) return 'vorbereitung';
  if (process.applicationStatus === 'vorbereitung' && process.applicationSubmittedAt) return 'eingereicht';
  if (process.applicationStatus === 'eingereicht' && process.decisionReceivedAt && process.outcome?.toLowerCase().includes('bewill')) return 'bewilligt';
  if (process.applicationStatus === 'eingereicht' && process.decisionReceivedAt && process.outcome?.toLowerCase().includes('ablehn')) return 'abgelehnt';
  if (process.applicationStatus === 'abgelehnt' && process.objectionDueAt) return 'widerspruch';
  if ((process.applicationStatus === 'bewilligt' || process.applicationStatus === 'widerspruch') && process.outcome) return 'abgeschlossen';
  return undefined;
}

export function buildEqualizationGuidance(process: EqualizationProcessRecord): EqualizationGuidance {
  return {
    title: 'Gleichstellung-/GdB-Statusführung',
    objective: equalizationStatusObjective(process.applicationStatus),
    warnings: evaluateEqualizationWarnings(process),
    suggestedNextStatus: suggestNextEqualizationStatus(process)
  };
}
