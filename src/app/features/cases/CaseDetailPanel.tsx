import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { CaseDetailPanelSearchProps } from './caseWorkbenchTypes';

type CaseDetailPanelProps = CaseDetailPanelSearchProps & {
  children: ReactNode;
};

export function CaseDetailPanel({
  children,
  searchQuery,
  searchOnlySelectedCase,
  searchResults,
  onSearchSubmit,
  onSearchQueryChange,
  onSearchOnlySelectedCaseChange,
  onSelectSearchResult
}: CaseDetailPanelProps) {
  return (
    <section className="industrial-panel case-detail-panel">
      <form onSubmit={(event) => void onSearchSubmit(event)} className="knowledge-search-bar">
        <Search className="h-4 w-4 text-yellow-300" />
        <input
          className="industrial-input"
          data-global-search-target="case-fulltext"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Volltextsuche in Notizen, Protokollen und Dokumenten …"
        />
        <label className="industrial-checkbox-row compact">
          <input
            type="checkbox"
            checked={searchOnlySelectedCase}
            onChange={(event) => onSearchOnlySelectedCaseChange(event.target.checked)}
          />
          <span>nur diese Fallakte</span>
        </label>
        <button type="submit" className="industrial-button">Suchen</button>
      </form>

      {!!searchResults.length && (
        <div className="case-search-results">
          {searchResults.map((result) => (
            <button
              key={`${result.sourceType}-${result.sourceId}`}
              type="button"
              className="case-search-result"
              onClick={() => onSelectSearchResult(result)}
            >
              <span>{result.sourceType === 'note' ? 'Notiz' : 'Dokument'} · {(result.caseNumbers?.length ? result.caseNumbers.join(', ') : result.caseNumber)}</span>
              <strong>{result.title}</strong>
              <p>{result.excerpt}</p>
            </button>
          ))}
        </div>
      )}

      {children}
    </section>
  );
}
