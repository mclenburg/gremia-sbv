import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CaseSearchResult } from '../../core/models/case-note.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { waitForBridge } from '../../core/bridge/waitForBridge';

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
  const [searchError, setSearchError] = useState('');

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
        limit: 80
      });
      setSearchResults(results);
      if (results.length) onSelect({ type: 'search', id: results[0].sourceId });
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Volltextsuche konnte nicht ausgeführt werden.');
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    searchOnlySelectedCase,
    setSearchOnlySelectedCase,
    searchResults,
    setSearchResults,
    searchError,
    setSearchError,
    runSearch
  };
}
