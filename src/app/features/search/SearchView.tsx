import { useState } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { UnifiedSearchHit } from '../../../domain/models/unified-search.model';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import { resolveSearchCaseNodeTarget } from '../../core/navigation/searchRecordTarget';
import { CaseDetailPanel } from '../cases/CaseDetailPanel';
import { SearchResultDetail } from '../cases/SearchResultDetail';
import { useCaseWorkbenchSearch } from '../cases/useCaseWorkbenchSearch';
import { ModuleFrame } from '../../shared/components/ModuleFrame';

type SearchViewProps = {
  cases: CaseRecord[];
  onOpenCaseNode: (target: CaseNodeTarget) => void;
  onOpenSearchRecord: (hit: UnifiedSearchHit) => boolean;
};

export function SearchView({ cases, onOpenCaseNode, onOpenSearchRecord }: SearchViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedHit, setSelectedHit] = useState<UnifiedSearchHit | null>(null);
  const search = useCaseWorkbenchSearch({ selectedCaseId, initialArea: 'all_data' });

  function openResult(hit: UnifiedSearchHit) {
    const caseTarget = resolveSearchCaseNodeTarget(hit);
    if (caseTarget) { onOpenCaseNode(caseTarget); return; }
    if (onOpenSearchRecord(hit)) return;
    setSelectedHit(hit);
  }

  return <ModuleFrame title="Suche" kicker="Gesamter Datenbestand"
    description="Durchsuchen Sie Fallakten, Dokumente und weitere gespeicherte Inhalte.">
    <CaseDetailPanel
      searchQuery={search.searchQuery}
      searchArea={search.searchArea}
      searchResults={search.searchResults}
      searchTotal={search.searchTotal}
      searchError={search.searchError}
      searchInfo={search.searchInfo}
      isSearching={search.isSearching}
      selectedSearchSourceTypes={search.selectedSearchSourceTypes}
      onSearchSubmit={(event) => { setSelectedHit(null); return search.runSearch(event); }}
      onSearchQueryChange={(value) => { setSelectedHit(null); search.setSearchQuery(value); }}
      onSearchAreaChange={(value) => { setSelectedHit(null); search.setSearchArea(value); }}
      onSearchSourceTypesChange={(value) => { setSelectedHit(null); search.setSelectedSearchSourceTypes(value); }}
      onSelectSearchResult={openResult}
      onLoadMoreSearchResults={search.loadMoreSearchResults}
      casePicker={search.searchArea === 'current_case' ? <label className="industrial-field">
        <span>Fallakte auswählen</span>
        <select className="industrial-select" value={selectedCaseId}
          onChange={(event) => { setSelectedHit(null); setSelectedCaseId(event.target.value); }}>
          <option value="">Bitte Fallakte auswählen</option>
          {cases.map((caseRecord) => <option key={caseRecord.id} value={caseRecord.id}>
            {caseRecord.caseNumber} · {caseRecord.displayName}
          </option>)}
        </select>
      </label> : undefined}
    >
      {selectedHit && <article className="case-detail-content" aria-label="Ausgewählter Suchtreffer">
        <SearchResultDetail result={selectedHit} />
      </article>}
    </CaseDetailPanel>
  </ModuleFrame>;
}
