import type { UnifiedSearchHit } from '../../../domain/models/unified-search.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SearchSnippet } from './SearchSnippet';

type SearchResultsPanelProps = {
  results: UnifiedSearchHit[];
  total: number;
  isSearching: boolean;
  onSelect: (hit: UnifiedSearchHit) => void;
  onLoadMore: () => void | Promise<void>;
};

export function SearchResultsPanel({ results, total, isSearching, onSelect, onLoadMore }: SearchResultsPanelProps) {
  if (!results.length) return null;
  return <div className="case-search-results" aria-label="Suchtreffer">
    <p className="industrial-meta">{results.length} von {total} Treffern angezeigt</p>
    {results.map((result) => <button
      key={`${result.sourceType}-${result.sourceId}`}
      type="button" className="case-search-result"
      onClick={() => onSelect(result)}
    >
      <span>
        {result.module} · {result.sourceLabel}{result.caseNumber
          ? ` · ${result.caseNumbers && result.caseNumbers.length > 1 ? 'Fallakten' : 'Fallakte'} ${result.caseNumbers?.length ? result.caseNumbers.join(', ') : result.caseNumber}`
          : ' · Ohne Fallaktenbezug'}
        {result.extractionQuality === 'ocr' ? ' · OCR-Text' : ''}
      </span>
      <strong>{result.title}</strong>
      <p><SearchSnippet excerpt={result.excerpt} /></p>
    </button>)}
    {results.length < total && <ToolbarButton onClick={() => void onLoadMore()} disabled={isSearching}>
      {isSearching ? 'Lade weitere Treffer …' : 'Weitere Treffer laden'}
    </ToolbarButton>}
  </div>;
}
