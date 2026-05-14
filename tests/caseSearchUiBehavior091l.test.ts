import { describe, expect, it } from 'vitest';
import { buildCaseSearchInput, MIN_CASE_SEARCH_QUERY_LENGTH } from '../src/app/features/cases/useCaseWorkbenchSearch';

const selectedCaseId = 'case-1';

describe('Fallakten-Suche UI-Verhalten 0.9.1l', () => {
  it('treats the empty source filter as Alle Inhalte instead of sending an empty filter list', () => {
    const input = buildCaseSearchInput({
      query: '  Arbeitsplatz  ',
      selectedCaseId,
      searchOnlySelectedCase: true,
      selectedSearchSourceTypes: [],
    });

    expect(input).toEqual({
      query: 'Arbeitsplatz',
      caseId: selectedCaseId,
      limit: 80,
      sourceTypes: undefined,
    });
  });

  it('keeps explicit source filters when the user limits the search scope', () => {
    const input = buildCaseSearchInput({
      query: 'BEM',
      selectedCaseId,
      searchOnlySelectedCase: false,
      selectedSearchSourceTypes: ['bem', 'measure_note'],
    });

    expect(input).toEqual({
      query: 'BEM',
      caseId: undefined,
      limit: 80,
      sourceTypes: ['bem', 'measure_note'],
    });
  });

  it('documents the minimum query length used for visible search feedback', () => {
    expect(MIN_CASE_SEARCH_QUERY_LENGTH).toBe(2);
  });
});
