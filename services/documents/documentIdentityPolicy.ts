import type { DatabaseAdapter } from '../databaseService.js';
import { readTemplateDefaultValues } from '../templateDefaultService.js';
import type { TemplateDefaultValues } from '../../src/domain/models/template-default.model.js';

function trimmed(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueNonEmpty(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines.map(trimmed).filter(Boolean)) {
    if (seen.has(line)) continue;
    seen.add(line);
    result.push(line);
  }
  return result;
}

export function documentDefaultsForDatabase(db: DatabaseAdapter): TemplateDefaultValues {
  return readTemplateDefaultValues(db);
}

export function sbvSenderLines(defaults: TemplateDefaultValues): string[] {
  const lines = uniqueNonEmpty([
    defaults['sbv.name'],
    defaults['sbv.funktion'],
    defaults['sbv.email'],
    defaults['sbv.telefon'],
  ]);
  return lines.length ? lines : ['Schwerbehindertenvertretung'];
}

export function sbvSignature(defaults: TemplateDefaultValues): string {
  return trimmed(defaults['sbv.signatur']) || 'Mit freundlichen Grüßen\nSchwerbehindertenvertretung';
}

export function employerRecipientLines(
  defaults: TemplateDefaultValues,
  fallback = 'Arbeitgeber',
): string[] {
  const lines = uniqueNonEmpty([
    defaults['arbeitgeber.ansprechpartner'],
    defaults['arbeitgeber.personalabteilung'],
    defaults['arbeitgeber.name'],
  ]);
  return lines.length ? lines : [fallback];
}

export function operationContextLine(defaults: TemplateDefaultValues): string {
  return uniqueNonEmpty([
    defaults['unternehmen.name'],
    defaults['standort.name'],
  ]).join(' · ');
}

export function appendOperationContext(
  label: string,
  defaults: TemplateDefaultValues,
): string {
  const context = operationContextLine(defaults);
  return context ? `${label} · ${context}` : label;
}
