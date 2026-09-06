import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';

export interface PersonDirectorySummary {
  total: number;
  severelyDisabled: number;
  equivalent: number;
  pendingOrUnclear: number;
  leftCompany: number;
}

export function summarizePersonDirectory(persons: readonly ProtectedPersonRecord[]): PersonDirectorySummary {
  return persons.reduce<PersonDirectorySummary>((summary, person) => {
    summary.total += 1;
    if (person.protectionStatus === 'severely_disabled') summary.severelyDisabled += 1;
    if (person.protectionStatus === 'equivalent') summary.equivalent += 1;
    if (person.protectionStatus === 'application_pending' || person.protectionStatus === 'unclear' || person.protectionStatus === 'expired') {
      summary.pendingOrUnclear += 1;
    }
    if (person.employmentState === 'left_company') summary.leftCompany += 1;
    return summary;
  }, { total: 0, severelyDisabled: 0, equivalent: 0, pendingOrUnclear: 0, leftCompany: 0 });
}
