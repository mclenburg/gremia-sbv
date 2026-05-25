import type { LegalNormRecord } from '../../core/models/knowledge.model';
import { SBV_ADVISOR_KNOWLEDGE_ENTRIES } from './knowledgeAdvisorData';

function normalizeKnowledgeText(value: string): string {
  return value.toLocaleLowerCase('de-DE');
}

function knowledgeSearchText(norm: LegalNormRecord): string {
  return normalizeKnowledgeText([
    norm.source,
    norm.paragraph,
    norm.title,
    norm.shortText,
    norm.sbvMeaning,
    norm.practiceNote,
    norm.typicalCases,
    ...(norm.tags ?? [])
  ].filter(Boolean).join(' '));
}

export function mergeKnowledgeNorms(remoteRows: LegalNormRecord[]): LegalNormRecord[] {
  const byKey = new Map<string, LegalNormRecord>();
  for (const norm of [...SBV_ADVISOR_KNOWLEDGE_ENTRIES, ...remoteRows]) {
    const key = `${norm.source}::${norm.paragraph}`.toLocaleLowerCase('de-DE');
    byKey.set(key, { ...byKey.get(key), ...norm });
  }
  return [...byKey.values()].sort((a, b) => `${a.source} ${a.paragraph}`.localeCompare(`${b.source} ${b.paragraph}`, 'de-DE', { numeric: true }));
}

export function filterKnowledgeNorms(rows: LegalNormRecord[], query: string, source: string): LegalNormRecord[] {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalizeKnowledgeText);
  return rows.filter((norm) => {
    if (source && norm.source !== source) return false;
    const haystack = knowledgeSearchText(norm);
    return terms.every((term) => haystack.includes(term));
  });
}
