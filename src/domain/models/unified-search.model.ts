export type SearchArea = 'current_case' | 'all_cases' | 'all_data';

export interface UnifiedSearchQuery {
  query: string;
  area: SearchArea;
  currentCaseId?: string;
  sourceTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface UnifiedSearchHit {
  sourceType: string;
  sourceId: string;
  module: string;
  sourceLabel: string;
  title: string;
  excerpt: string;
  caseId?: string;
  caseNumber?: string;
  caseNumbers?: string[];
  navigationKind: string;
  navigationId: string;
  navigationSubId?: string;
  extractionQuality: string;
  occurredAt?: string;
}

export interface UnifiedSearchPage {
  total: number;
  hits: UnifiedSearchHit[];
  indexedAt?: string;
}

export interface UnifiedSearchDetail {
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
}
