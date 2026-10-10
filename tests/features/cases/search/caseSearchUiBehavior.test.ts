import { describe, expect, it } from 'vitest';
import { buildCaseSearchInput, MIN_CASE_SEARCH_QUERY_LENGTH } from '../../../../src/app/features/cases/useCaseWorkbenchSearch';

const selectedCaseId = 'case-1';

describe('Fallakten-Suche UI-Verhalten 0.9.1l', () => {
  it('treats the empty source filter as Alle Inhalte instead of sending an empty filter list', () => {
    const input = buildCaseSearchInput({
      query: '  Arbeitsplatz  ',
      selectedCaseId,
      searchArea: 'current_case',
      selectedSearchSourceTypes: [],
    });

    expect(input).toEqual({
      query: 'Arbeitsplatz',
      area: 'current_case',
      currentCaseId: selectedCaseId,
      limit: 50,
      offset: 0,
      sourceTypes: undefined,
    });
  });

  it('keeps explicit source filters when the user limits the search scope', () => {
    const input = buildCaseSearchInput({
      query: 'BEM',
      selectedCaseId,
      searchArea: 'all_data',
      selectedSearchSourceTypes: ['bem', 'measure_note'],
    });

    expect(input).toEqual({
      query: 'BEM',
      area: 'all_data',
      currentCaseId: undefined,
      limit: 50,
      offset: 0,
      sourceTypes: ['bem', 'measure_note'],
    });
  });

  it('unterscheidet alle Fallakten vom gesamten Datenbestand', () => {
    expect(buildCaseSearchInput({ query: 'Bescheid', selectedCaseId, searchArea: 'all_cases', selectedSearchSourceTypes: [] }))
      .toMatchObject({ area: 'all_cases', currentCaseId: undefined });
  });

  it('documents the minimum query length used for visible search feedback', () => {
    expect(MIN_CASE_SEARCH_QUERY_LENGTH).toBe(2);
  });
});
