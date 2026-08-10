import type { CaseSearchResult, CaseSearchSourceType, CaseSearchHighlightSegment } from '../../src/app/core/models/case-note.model.js';
import { CASE_SEARCH_PROVIDERS } from './searchProviders.js';
export interface CaseSearchResultRow {
  source_type: CaseSearchSourceType;
  source_id: string;
  source_label: string;
  case_id: string;
  case_number: string | null;
  case_numbers?: string | null;
  title: string | null;
  excerpt: string | null;
  extraction_quality: CaseSearchResult['extractionQuality'] | null;
  navigation_kind: CaseSearchResult['navigationKind'] | null;
  navigation_id: string | null;
  navigation_sub_id: string | null;
  occurred_at: string | null;
  rank: number | string | null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export function escapeFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"`)
    .join(' AND ');
}

export const SEARCH_SOURCE_PRIORITY: Partial<Record<CaseSearchSourceType, number>> = {
  case: 0,
  note: 1,
  measure_note: 2,
  document: 3,
  document_ocr: 4,
  bem: 5,
  prevention: 5,
  termination: 5,
  equalization: 5,
  participation: 5,
  workplace_accommodation: 6,
  measure: 7,
  bem_event: 8,
  prevention_event: 8,
  participation_event: 8,
  measure_event: 8,
};

export function normalizeSourceTypes(values?: readonly CaseSearchSourceType[]): CaseSearchSourceType[] {
  if (!values?.length) return [];
  const allowed = new Set(CASE_SEARCH_PROVIDERS.map((provider) => provider.sourceType));
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

export function highlightSegments(excerpt: string): CaseSearchHighlightSegment[] {
  const parts: CaseSearchHighlightSegment[] = [];
  let remaining = excerpt;
  while (remaining.includes('[') && remaining.includes(']')) {
    const start = remaining.indexOf('[');
    const end = remaining.indexOf(']', start + 1);
    if (start < 0 || end < 0) break;
    if (start > 0) parts.push({ text: remaining.slice(0, start), match: false });
    parts.push({ text: remaining.slice(start + 1, end), match: true });
    remaining = remaining.slice(end + 1);
  }
  if (remaining) parts.push({ text: remaining, match: false });
  return parts.length ? parts.filter((part) => part.text) : [{ text: excerpt, match: false }];
}

export function sourcePriority(type: CaseSearchSourceType): number {
  return SEARCH_SOURCE_PRIORITY[type] ?? 10;
}

export function rankResults(results: CaseSearchResult[]): CaseSearchResult[] {
  return [...results].sort((left, right) => {
    const priority = sourcePriority(left.sourceType) - sourcePriority(right.sourceType);
    if (priority !== 0) return priority;
    const rank = left.rank - right.rank;
    if (rank !== 0) return rank;
    return String(right.date ?? '').localeCompare(String(left.date ?? ''));
  });
}

export function sourceTypeFilterClause(sourceTypes: readonly CaseSearchSourceType[]): { clause: string; params: CaseSearchSourceType[] } {
  if (!sourceTypes.length) return { clause: '', params: [] };
  return { clause: ` AND i.source_type IN (${sourceTypes.map(() => '?').join(', ')})`, params: [...sourceTypes] };
}

export function fallbackSourceTypeFilterClause(sourceTypes: readonly CaseSearchSourceType[]): { clause: string; params: CaseSearchSourceType[] } {
  if (!sourceTypes.length) return { clause: '', params: [] };
  return { clause: ` AND source_type IN (${sourceTypes.map(() => '?').join(', ')})`, params: [...sourceTypes] };
}


export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightQueryInExcerpt(excerpt: string, query: string): CaseSearchHighlightSegment[] {
  const terms = query.trim().split(/\s+/).map(escapeRegex).filter(Boolean);
  if (!terms.length || !excerpt) return [{ text: excerpt, match: false }];
  return highlightSegments(excerpt.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '[$1]'));
}

export function mapRow(row: CaseSearchResultRow): CaseSearchResult {
  const caseNumbers = typeof row.case_numbers === 'string' && row.case_numbers.trim()
    ? row.case_numbers.split(',').map((entry: string) => entry.trim()).filter(Boolean)
    : undefined;
  return {
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceLabel: row.source_label,
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    caseNumbers,
    title: row.title ?? row.source_label ?? 'Suchtreffer',
    excerpt: row.excerpt ?? '',
    excerptSegments: highlightSegments(row.excerpt ?? ''),
    extractionQuality: row.extraction_quality ?? undefined,
    navigationKind: row.navigation_kind ?? undefined,
    navigationId: row.navigation_id ?? undefined,
    navigationSubId: row.navigation_sub_id ?? undefined,
    date: row.occurred_at ?? undefined,
    rank: Number(row.rank ?? 100),
  };
}

