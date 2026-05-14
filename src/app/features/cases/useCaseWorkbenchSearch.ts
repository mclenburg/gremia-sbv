import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CaseSearchResult, CaseSearchSourceType } from '../../core/models/case-note.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

export const MIN_CASE_SEARCH_QUERY_LENGTH = 2;

export function buildCaseSearchInput({
  query,
  selectedCaseId,
  searchOnlySelectedCase,
  selectedSearchSourceTypes,
}: {
  query: string;
  selectedCaseId: string;
  searchOnlySelectedCase: boolean;
  selectedSearchSourceTypes: CaseSearchSourceType[];
}) {
  const trimmedQuery = query.trim();
  return {
    query: trimmedQuery,
    caseId: searchOnlySelectedCase ? selectedCaseId || undefined : undefined,
    limit: 80,
    sourceTypes: selectedSearchSourceTypes.length ? selectedSearchSourceTypes : undefined,
  };
}

export function useCaseWorkbenchSearch({
  selectedCaseId,
  onSelect
}: {
  selectedCaseId: string;
  onSelect: (selection: CaseExplorerSelection) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOnlySelectedCase, setSearchOnlySelectedCase] = useState(true);
  const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([]);
  const [selectedSearchSourceTypes, setSelectedSearchSourceTypes] = useState<CaseSearchSourceType[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searchInfo, setSearchInfo] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const announce = useAnnouncer();

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSearchError('');
    setSearchInfo('');
    const searchInput = buildCaseSearchInput({
      query: searchQuery,
      selectedCaseId,
      searchOnlySelectedCase,
      selectedSearchSourceTypes,
    });
    if (searchInput.query.length < MIN_CASE_SEARCH_QUERY_LENGTH) {
      const message = 'Bitte geben Sie mindestens zwei Zeichen für die Suche ein.';
      setSearchResults([]);
      setSearchInfo(message);
      announce(message, 'polite');
      return;
    }
    setIsSearching(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const results = await bridge.cases.search(searchInput);
      setSearchResults(results);
      const message = results.length === 1 ? 'Ein Suchtreffer gefunden.' : `${results.length} Suchtreffer gefunden.`;
      setSearchInfo(message);
      announce(message, 'polite');
      if (results.length) onSelect({ type: 'search', id: `${results[0].sourceType}:${results[0].sourceId}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Volltextsuche konnte nicht ausgeführt werden.';
      setSearchError(message);
      announce(message, 'assertive');
    } finally {
      setIsSearching(false);
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    searchOnlySelectedCase,
    setSearchOnlySelectedCase,
    searchResults,
    setSearchResults,
    selectedSearchSourceTypes,
    setSelectedSearchSourceTypes,
    searchError,
    setSearchError,
    searchInfo,
    setSearchInfo,
    isSearching,
    runSearch
  };
}
