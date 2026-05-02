import type { ContextualTemplateAction, TemplateSourceType } from '../src/app/core/models/template.model.js';

export interface PreventionStepLike {
  key?: string;
  title: string;
  objective?: string;
}

export interface ContextualTemplateCandidate {
  sourceType: TemplateSourceType;
  key?: string;
  title: string;
  hasMissingRecipient?: boolean;
}

export function resolveContextualTemplateAction(candidate: ContextualTemplateCandidate): ContextualTemplateAction | null {
  const key = `${candidate.key ?? ''} ${candidate.title}`.toLowerCase();

  if (candidate.sourceType === 'prevention') {
    if (key.includes('arbeitgeber') && (key.includes('anschreib') || key.includes('anforder') || key.includes('einleit'))) {
      return {
        id: 'prevention-request-letter',
        label: 'Schreiben erzeugen',
        templateKey: 'praeventionsverfahren-einfordern',
        category: 'praevention',
        sourceType: 'prevention',
        description: 'Erzeugt direkt aus diesem Präventionsschritt das Schreiben zur Einleitung des Präventionsverfahrens.'
      };
    }
    if (key.includes('reaktion') || key.includes('nachhalten') || key.includes('frist')) {
      return {
        id: 'prevention-reminder-letter',
        label: 'Nachfassung erzeugen',
        templateKey: 'freundliche-fristerinnerung',
        category: 'frist',
        sourceType: 'prevention',
        description: 'Erzeugt eine kurze, verbindliche Erinnerung aus dem aktuellen Verfahrensstand.'
      };
    }
    if (key.includes('unterlagen') || key.includes('beteiligung')) {
      return {
        id: 'prevention-documents-letter',
        label: 'Unterlagen anfordern',
        templateKey: 'sbv-beteiligung-unterlagen-nachfordern',
        category: 'beteiligung',
        sourceType: 'prevention',
        description: 'Fordert die vollständige Unterrichtung und Beteiligung der SBV nach.'
      };
    }
  }

  if (candidate.sourceType === 'case') {
    return {
      id: 'case-participation-letter',
      label: 'Schreiben aus Fall erzeugen',
      templateKey: 'sbv-beteiligung-unterlagen-nachfordern',
      category: 'beteiligung',
      sourceType: 'case',
      description: 'Erzeugt ein allgemeines SBV-Schreiben aus der geöffneten Fallakte.'
    };
  }

  return null;
}

export function mergeContextValues(...parts: Array<Record<string, string | undefined> | undefined>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const part of parts) {
    if (!part) continue;
    for (const [key, value] of Object.entries(part)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        merged[key] = String(value);
      }
    }
  }
  return merged;
}

export function missingPlaceholderWarning(placeholders: string[]): string {
  if (!placeholders.length) return '';
  return `Nicht alle Platzhalter konnten automatisch befüllt werden: ${placeholders.join(', ')}.`;
}
