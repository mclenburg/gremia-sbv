import type { ReactNode } from 'react';
import { Download, Search } from 'lucide-react';
import type { CaseSearchHighlightSegment, CaseSearchSourceType } from '../../core/models/case-note.model';
import type { CaseDetailPanelSearchProps } from './caseWorkbenchTypes';

const SOURCE_FILTERS: readonly { type: CaseSearchSourceType; label: string }[] = [
  { type: 'case', label: 'Fallakte' },
  { type: 'note', label: 'Fallnotizen' },
  { type: 'document', label: 'Dokumente' },
  { type: 'document_ocr', label: 'OCR-Texte' },
  { type: 'measure_note', label: 'Maßnahmennotizen' },
  { type: 'bem', label: 'BEM' },
  { type: 'prevention', label: 'Prävention' },
  { type: 'termination', label: 'Kündigung' },
  { type: 'equalization', label: 'Gleichstellung/GdB' },
  { type: 'participation', label: 'SBV-Beteiligung' },
  { type: 'workplace_accommodation', label: 'Arbeitsplatzgestaltung' },
];

type CaseDetailPanelProps = CaseDetailPanelSearchProps & {
  children: ReactNode;
  onExportHandover?: () => void;
  canExportHandover?: boolean;
};

function toggleSourceType(values: CaseSearchSourceType[], type: CaseSearchSourceType): CaseSearchSourceType[] {
  return values.includes(type) ? values.filter((value) => value !== type) : [...values, type];
}

function renderExcerpt(segments?: CaseSearchHighlightSegment[], fallback = '') {
  const safeSegments = segments?.length ? segments : [{ text: fallback, match: false }];
  return safeSegments.map((segment, index) => segment.match
    ? <mark key={`${segment.text}-${index}`}>{segment.text}</mark>
    : <span key={`${segment.text}-${index}`}>{segment.text}</span>);
}

export function CaseDetailPanel({
  children,
  searchQuery,
  searchOnlySelectedCase,
  searchResults,
  searchError,
  searchInfo,
  isSearching,
  selectedSearchSourceTypes,
  onSearchSubmit,
  onSearchQueryChange,
  onSearchOnlySelectedCaseChange,
  onSearchSourceTypesChange,
  onSelectSearchResult,
  onExportHandover,
  canExportHandover
}: CaseDetailPanelProps) {
  return (
    <section className="industrial-panel case-detail-panel">
      <form
        onSubmit={(event) => void onSearchSubmit(event)}
        className="knowledge-search-bar case-detail-search-bar"
        aria-busy={isSearching}
      >
        <Search className="h-4 w-4 text-yellow-300" aria-hidden="true" />
        <input
          className="industrial-input"
          data-global-search-target="case-fulltext"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Volltextsuche in Fallakte, Notizen, Protokollen und Dokumenten …"
          aria-label="Volltextsuche in der Fallakte"
        />
        <label className="industrial-checkbox-row compact">
          <input
            type="checkbox"
            checked={searchOnlySelectedCase}
            onChange={(event) => onSearchOnlySelectedCaseChange(event.target.checked)}
          />
          <span>nur diese Fallakte</span>
        </label>
        <div className="case-detail-search-actions">
          <button
            type="submit"
            className="industrial-secondary-button case-detail-search-button"
            disabled={isSearching}
          >
            {isSearching ? 'Suche läuft …' : 'Suchen'}
          </button>
          {onExportHandover && (
            <button
              type="button"
              className="industrial-secondary-button case-detail-handover-export-button"
              disabled={!canExportHandover}
              onClick={onExportHandover}
              aria-label="Ausgewählte Fallakte als Übergabepaket exportieren"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Übergabe exportieren
            </button>
          )}
        </div>
      </form>



      {(searchError || searchInfo) && (
        <p
          className={searchError ? "case-search-status error" : "case-search-status"}
          role={searchError ? "alert" : "status"}
          aria-live={searchError ? "assertive" : "polite"}
        >
          {searchError || searchInfo}
        </p>
      )}

      <fieldset className="case-search-source-filters" aria-label="Suchbereich einschränken">
        <legend>Suchbereiche</legend>
        <button
          type="button"
          className="industrial-secondary-button compact"
          onClick={() => onSearchSourceTypesChange([])}
          aria-pressed={selectedSearchSourceTypes.length === 0}
        >
          Alle Inhalte
        </button>
        {SOURCE_FILTERS.map((filter) => (
          <label key={filter.type} className="industrial-checkbox-row compact">
            <input
              type="checkbox"
              checked={selectedSearchSourceTypes.includes(filter.type)}
              onChange={() => onSearchSourceTypesChange(toggleSourceType(selectedSearchSourceTypes, filter.type))}
            />
            <span>{filter.label}</span>
          </label>
        ))}
      </fieldset>

      {!!searchResults.length && (
        <div className="case-search-results" aria-label="Suchtreffer">
          {searchResults.map((result) => (
            <button
              key={`${result.sourceType}-${result.sourceId}`}
              type="button"
              className="case-search-result"
              onClick={() => onSelectSearchResult(result)}
            >
              <span>
                {result.sourceLabel ?? result.sourceType} · {(result.caseNumbers?.length ? result.caseNumbers.join(', ') : result.caseNumber)}
                {result.extractionQuality === 'ocr' ? ' · OCR-Text' : ''}
              </span>
              <strong>{result.title}</strong>
              <p>{renderExcerpt(result.excerptSegments, result.excerpt)}</p>
            </button>
          ))}
        </div>
      )}

      {children}
    </section>
  );
}
