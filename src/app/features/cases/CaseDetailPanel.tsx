import type { ReactNode } from 'react';
import { Download, Search } from 'lucide-react';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import type { SearchArea } from '../../../domain/models/unified-search.model';
import type { CaseDetailPanelSearchProps } from './caseWorkbenchTypes';
import { SearchResultsPanel } from './SearchResultsPanel';

const SEARCH_AREAS: readonly { id: SearchArea; label: string }[] = [
  { id: 'current_case', label: 'Diese Fallakte' },
  { id: 'all_cases', label: 'Alle Fallakten' },
  { id: 'all_data', label: 'Gesamter Datenbestand' },
];

const SOURCE_FILTERS: readonly { type: string; label: string }[] = [
  { type: 'case', label: 'Fallakte' },
  { type: 'note', label: 'Fallnotizen' },
  { type: 'document', label: 'Dokumente' },
  { type: 'measure_note', label: 'Maßnahmennotizen' },
  { type: 'bem', label: 'BEM' },
  { type: 'prevention', label: 'Prävention' },
  { type: 'termination', label: 'Kündigung' },
  { type: 'equalization', label: 'Gleichstellung/GdB' },
  { type: 'participation', label: 'SBV-Beteiligung' },
  { type: 'workplace_accommodation', label: 'Arbeitsplatzgestaltung' },
  { type: 'person', label: 'Personen' },
  { type: 'contact', label: 'Kontakte' },
  { type: 'journal', label: 'Tätigkeitsjournal' },
  { type: 'legal_norm', label: 'Wissensbasis' },
  { type: 'template', label: 'Vorlagen' },
  { type: 'deadline', label: 'Fristen' },
  { type: 'control_protocol', label: 'SBV-Steuerung' },
];

type CaseDetailPanelProps = CaseDetailPanelSearchProps & {
  children: ReactNode;
  casePicker?: ReactNode;
  onExportHandover?: () => void;
  canExportHandover?: boolean;
};

function toggleSourceType(values: string[], type: string): string[] {
  return values.includes(type) ? values.filter((value) => value !== type) : [...values, type];
}

export function CaseDetailPanel({
  children,
  casePicker,
  searchQuery,
  searchArea,
  searchResults,
  searchTotal,
  searchError,
  searchInfo,
  isSearching,
  selectedSearchSourceTypes,
  onSearchSubmit,
  onSearchQueryChange,
  onSearchAreaChange,
  onSearchSourceTypesChange,
  onSelectSearchResult,
  onLoadMoreSearchResults,
  onExportHandover,
  canExportHandover
}: CaseDetailPanelProps) {
  return (
    <section className="industrial-panel case-detail-panel">
      <form
        onSubmit={(event) => void onSearchSubmit(event)} className="knowledge-search-bar case-detail-search-bar"
        aria-busy={isSearching}
      >
        <Search className="industrial-icon case-detail-search-icon" aria-hidden="true" />
        <input className="industrial-input"
          data-global-search-target="case-fulltext"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Fallakten, Dokumente und weitere Daten durchsuchen …"
          aria-label="Volltextsuche"
        />
        <fieldset className="case-search-area-options">
          <legend>Suchbereich</legend>
          {SEARCH_AREAS.map((area) => <label key={area.id} className="industrial-checkbox-row compact">
            <input type="radio" name="case-search-area" value={area.id} checked={searchArea === area.id}
              onChange={() => onSearchAreaChange(area.id)} className="industrial-choice-input" />
            <span>{area.label}</span>
          </label>)}
        </fieldset>
        {casePicker}
        <div className="case-detail-search-actions">
          <ToolbarButton
            type="submit" className="case-detail-search-button"
            disabled={isSearching}
          >
            {isSearching ? 'Suche läuft …' : 'Suchen'}
          </ToolbarButton>
          {onExportHandover && (
            <ToolbarButton className="case-detail-handover-export-button"
              disabled={!canExportHandover}
              onClick={onExportHandover}
              aria-label="Ausgewählte Fallakte als Übergabepaket exportieren"
            >
              <Download className="industrial-icon" aria-hidden="true" />
              Übergabe exportieren
            </ToolbarButton>
          )}
        </div>
      </form>



      {(searchError || searchInfo) && (
        <p className={searchError ? "case-search-status error" : "case-search-status"}
          role={searchError ? "alert" : "status"}
          aria-live={searchError ? "assertive" : "polite"}
        >
          {searchError || searchInfo}
        </p>
      )}

      <fieldset className="case-search-source-filters" aria-label="Inhaltstypen einschränken">
        <legend>Häufige Inhaltstypen (optional)</legend>
        <ToolbarButton
          onClick={() => onSearchSourceTypesChange([])}
          aria-pressed={selectedSearchSourceTypes.length === 0}
        >
          Alle Inhalte
        </ToolbarButton>
        {SOURCE_FILTERS.map((filter) => (
          <label key={filter.type} className="industrial-checkbox-row compact">
            <input
              type="checkbox"
              className="industrial-choice-input"
              checked={selectedSearchSourceTypes.includes(filter.type)}
              onChange={() => onSearchSourceTypesChange(toggleSourceType(selectedSearchSourceTypes, filter.type))} />
            <span>{filter.label}</span>
          </label>
        ))}
      </fieldset>

      <SearchResultsPanel results={searchResults} total={searchTotal} isSearching={isSearching}
        onSelect={onSelectSearchResult} onLoadMore={onLoadMoreSearchResults} />

      {children}
    </section>
  );
}
