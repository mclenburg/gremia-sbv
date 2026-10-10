import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { SearchArea, UnifiedSearchHit, UnifiedSearchQuery } from '../../../domain/models/unified-search.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

export const MIN_CASE_SEARCH_QUERY_LENGTH = 2;
const PAGE_SIZE = 50;

export function buildCaseSearchInput({ query, selectedCaseId, searchArea, selectedSearchSourceTypes, offset = 0 }: {
  query: string;
  selectedCaseId: string;
  searchArea: SearchArea;
  selectedSearchSourceTypes: string[];
  offset?: number;
}): UnifiedSearchQuery {
  return {
    query: query.trim(),
    area: searchArea,
    currentCaseId: searchArea === 'current_case' ? selectedCaseId || undefined : undefined,
    limit: PAGE_SIZE,
    offset,
    sourceTypes: selectedSearchSourceTypes.length ? selectedSearchSourceTypes : undefined,
  };
}

export function useCaseWorkbenchSearch({ selectedCaseId, onSelect }: {
  selectedCaseId: string;
  onSelect: (selection: CaseExplorerSelection) => void;
}) {
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchArea, setSearchAreaState] = useState<SearchArea>('current_case');
  const [searchResults, setSearchResults] = useState<UnifiedSearchHit[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [selectedSearchSourceTypes, setSelectedSearchSourceTypesState] = useState<string[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searchInfo, setSearchInfo] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const requestId = useRef(0);
  const lastQuery = useRef<UnifiedSearchQuery | null>(null);
  const announce = useAnnouncer();

  useEffect(() => {
    if (searchArea !== 'current_case') return;
    requestId.current += 1;
    lastQuery.current = null;
    setSearchResults([]);
    setSearchTotal(0);
    setSearchInfo('');
  }, [selectedCaseId, searchArea]);

  function resetResults() {
    requestId.current += 1;
    lastQuery.current = null;
    setSearchResults([]);
    setSearchTotal(0);
    setSearchInfo('');
    setSearchError('');
    setIsSearching(false);
  }

  function setSearchQuery(value: string) { setSearchQueryState(value); resetResults(); }
  function setSearchArea(value: SearchArea) { setSearchAreaState(value); resetResults(); }
  function setSelectedSearchSourceTypes(value: string[]) { setSelectedSearchSourceTypesState(value); resetResults(); }

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const input = buildCaseSearchInput({ query: searchQuery, selectedCaseId, searchArea, selectedSearchSourceTypes });
    resetResults();
    if (input.query.length < MIN_CASE_SEARCH_QUERY_LENGTH) {
      const message = 'Bitte geben Sie mindestens zwei Zeichen für die Suche ein.';
      setSearchInfo(message);
      announce(message, 'polite');
      return;
    }
    if (searchArea === 'current_case' && !input.currentCaseId) {
      setSearchError('Bitte wählen Sie zuerst eine Fallakte oder einen anderen Suchbereich.');
      return;
    }
    const currentRequest = requestId.current;
    setIsSearching(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const page = await bridge.cases.searchUnified(input);
      if (currentRequest !== requestId.current) return;
      lastQuery.current = input;
      setSearchResults(page.hits);
      setSearchTotal(page.total);
      const message = page.total === 1 ? 'Ein Suchtreffer gefunden.' : `${page.total} Suchtreffer gefunden.`;
      setSearchInfo(message);
      announce(message, 'polite');
      if (page.hits.length) onSelect({ type: 'search', id: `${page.hits[0].sourceType}:${page.hits[0].sourceId}` });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      const message = error instanceof Error ? error.message : 'Volltextsuche konnte nicht ausgeführt werden.';
      setSearchError(message);
      announce(message, 'assertive');
    } finally {
      if (currentRequest === requestId.current) setIsSearching(false);
    }
  }

  async function loadMoreSearchResults() {
    const base = lastQuery.current;
    if (!base || isSearching || searchResults.length >= searchTotal) return;
    const currentRequest = requestId.current;
    setIsSearching(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const page = await bridge.cases.searchUnified({ ...base, offset: searchResults.length });
      if (currentRequest !== requestId.current) return;
      setSearchResults((previous) => [...previous, ...page.hits]);
      setSearchTotal(page.total);
    } catch (error) {
      if (currentRequest === requestId.current) setSearchError(error instanceof Error ? error.message : 'Weitere Treffer konnten nicht geladen werden.');
    } finally {
      if (currentRequest === requestId.current) setIsSearching(false);
    }
  }

  return {
    searchQuery, setSearchQuery, searchArea, setSearchArea, searchResults, setSearchResults,
    searchTotal, selectedSearchSourceTypes, setSelectedSearchSourceTypes,
    searchError, setSearchError, searchInfo, setSearchInfo, isSearching,
    runSearch, loadMoreSearchResults,
  };
}
