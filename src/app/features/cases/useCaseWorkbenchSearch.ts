import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CaseSearchResult, CaseSearchSourceType } from '../../core/models/case-note.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

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
  const announce = useAnnouncer();

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSearchError('');
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
      const results = await bridge.cases.search({
        query: searchQuery,
        caseId: searchOnlySelectedCase ? selectedCaseId || undefined : undefined,
        limit: 80,
        sourceTypes: selectedSearchSourceTypes
      });
      setSearchResults(results);
      announce(results.length === 1 ? 'Ein Suchtreffer gefunden.' : `${results.length} Suchtreffer gefunden.`, 'polite');
      if (results.length) onSelect({ type: 'search', id: `${results[0].sourceType}:${results[0].sourceId}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Volltextsuche konnte nicht ausgeführt werden.';
      setSearchError(message);
      announce(message, 'assertive');
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
    runSearch
  };
}
