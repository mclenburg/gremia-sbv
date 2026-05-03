import { useMemo } from 'react';
import type { CaseRecord } from '../../core/models/case.model';

export function useCaseRegisterFilter(cases: CaseRecord[], caseFilter: string) {
  return useMemo(() => {
    const q = caseFilter.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((item) =>
      item.caseNumber.toLowerCase().includes(q)
      || item.displayName.toLowerCase().includes(q)
      || (item.summary ?? '').toLowerCase().includes(q)
      || item.category.toLowerCase().includes(q)
    );
  }, [cases, caseFilter]);
}
