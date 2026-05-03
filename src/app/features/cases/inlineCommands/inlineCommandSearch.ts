import type { CaseRecord } from '../../../core/models/case.model';
import type { LegalNormSuggestion } from '@services/textCommandPolicy';

export function filterCasesForInlineCommand(records: CaseRecord[], query: string): CaseRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return records.slice(0, 12);
  return records.filter((record) =>
    record.caseNumber.toLowerCase().includes(q)
    || record.displayName.toLowerCase().includes(q)
    || (record.summary ?? '').toLowerCase().includes(q)
    || record.category.toLowerCase().includes(q)
  ).slice(0, 12);
}

export function filterNormsForInlineCommand(norms: LegalNormSuggestion[], query: string): LegalNormSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return norms.slice(0, 12);
  return norms.filter((norm) =>
    norm.paragraph.toLowerCase().includes(q)
    || norm.title.toLowerCase().includes(q)
    || norm.source.toLowerCase().includes(q)
    || norm.shortText.toLowerCase().includes(q)
  ).slice(0, 12);
}

export function hasAnyInlineCommandOverlay(...drafts: unknown[]): boolean {
  return drafts.some(Boolean);
}
