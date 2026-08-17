export const CASE_ANONYMIZATION_CONFIRMATION = 'FALL ANONYMISIEREN';
export const REMOVED_FREETEXT_PREFIX = '[Freitext im Rahmen der Fallanonymisierung entfernt]';
export const REMOVED_PARTICIPANTS_TEXT = '[Beteiligte im Rahmen der Fallanonymisierung entfernt]';

import type { CaseAnonymizationMode } from '../src/domain/models/privacy-review.model.js';
export type { CaseAnonymizationMode } from '../src/domain/models/privacy-review.model.js';

const LOREM = ' Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

export function replaceFreeTextPreservingLength(original: string): string {
  if (!original) return original;
  if (original.length <= REMOVED_FREETEXT_PREFIX.length) return REMOVED_FREETEXT_PREFIX;
  let result = REMOVED_FREETEXT_PREFIX;
  while (result.length < original.length) result += LOREM;
  return result.slice(0, original.length);
}

export function assertCaseAnonymizationMode(value: unknown): CaseAnonymizationMode {
  if (value === 'marked_free_text' || value === 'replace_all_free_text') return value;
  throw new Error('Ungültiger Anonymisierungsmodus.');
}
