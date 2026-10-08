import type { ProtectedPersonRecord } from '../models/protected-person.model';

export interface EmploymentQuotaSnapshot {
  workplaces: number;
  requiredPlaces: number;
  recordedPersons: number;
  openPlaces: number;
  recordedRatePercent: number | null;
  status: 'no_obligation' | 'recorded_target_met' | 'recorded_target_open';
}

/** §§ 154, 157 SGB IX: statutory small-employer tiers and rounding from 60 workplaces. */
export function requiredQuotaPlaces(workplaces: number): number {
  if (!Number.isSafeInteger(workplaces) || workplaces < 0) throw new Error('Die Zahl maßgeblicher Arbeitsplätze ist ungültig.');
  if (workplaces < 20) return 0;
  if (workplaces < 40) return 1;
  if (workplaces < 60) return 2;
  return Math.floor(workplaces * 0.05 + 0.5);
}

function recordedAsCurrentlyEligible(person: ProtectedPersonRecord, today: string): boolean {
  return (person.recordKind ?? 'identified_person') === 'identified_person'
    && person.employmentState === 'active_employee'
    && (person.protectionStatus === 'severely_disabled' || person.protectionStatus === 'equivalent')
    && person.lifecycleState !== 'anonymized'
    && person.lifecycleState !== 'deleted_marker'
    && (!person.statusValidFrom || person.statusValidFrom <= today)
    && (!person.statusValidUntil || person.statusValidUntil >= today);
}

export function calculateEmploymentQuota(
  workplaces: number,
  persons: readonly ProtectedPersonRecord[],
  today: string,
): EmploymentQuotaSnapshot {
  const requiredPlaces = requiredQuotaPlaces(workplaces);
  const recordedPersons = persons.filter((person) => recordedAsCurrentlyEligible(person, today)).length;
  return {
    workplaces,
    requiredPlaces,
    recordedPersons,
    openPlaces: Math.max(0, requiredPlaces - recordedPersons),
    recordedRatePercent: workplaces > 0 ? Math.round((recordedPersons / workplaces) * 1000) / 10 : null,
    status: requiredPlaces === 0 ? 'no_obligation' : recordedPersons >= requiredPlaces ? 'recorded_target_met' : 'recorded_target_open',
  };
}
