import { describe, expect, it } from 'vitest';
import { validateUnifiedSearchInput } from '../../../electron/ipc/unifiedSearchInput';

describe('IPC-Eingabe der bereichsübergreifenden Suche', () => {
  it('validiert die drei Suchbereiche und die Seitenposition', () => {
    expect(validateUnifiedSearchInput({ query: '  Beratung  ', area: 'current_case', currentCaseId: 'fall-1' }))
      .toEqual({ query: 'Beratung', area: 'current_case', currentCaseId: 'fall-1', sourceTypes: undefined, limit: 50, offset: 0 });
    expect(validateUnifiedSearchInput({ query: 'Beratung', area: 'all_data', limit: 30, offset: 60 }))
      .toMatchObject({ area: 'all_data', currentCaseId: undefined, limit: 30, offset: 60 });
    expect(() => validateUnifiedSearchInput({ query: 'Beratung', area: 'current_case' })).toThrow(/Fall-ID/);
    expect(() => validateUnifiedSearchInput({ query: 'Beratung', area: 'anderes' })).toThrow(/Suchbereich/);
    expect(() => validateUnifiedSearchInput({ query: 'Beratung', area: 'all_data', offset: -1 })).toThrow(/Trefferposition/);
  });

  it('weist unbekannte Quellenfilter vor der Datenbanksuche ab', () => {
    expect(validateUnifiedSearchInput({ query: 'BEM', area: 'all_cases', sourceTypes: ['bem', 'bem'] }).sourceTypes).toEqual(['bem']);
    expect(() => validateUnifiedSearchInput({ query: 'BEM', area: 'all_data', sourceTypes: ['unknown'] })).toThrow(/Inhaltsfilter/);
  });
});
