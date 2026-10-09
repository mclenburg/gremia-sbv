import { describe, expect, it } from 'vitest';
import type { ProtectedPersonRecord } from '../../../src/domain/models/protected-person.model';
import { calculateEmploymentQuota, requiredQuotaPlaces } from '../../../src/domain/persons/employmentQuota';

function person(id: string, overrides: Partial<ProtectedPersonRecord> = {}): ProtectedPersonRecord {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    firstName: id,
    lastName: 'Test',
    employmentState: 'active_employee',
    protectionStatus: 'severely_disabled',
    statusSource: 'manual',
    lifecycleState: 'active',
    ...overrides,
  };
}

describe('Beschäftigungsquote als aktuelle Orientierung', () => {
  it.each([
    [0, 0], [19, 0], [20, 1], [39, 1], [40, 2], [59, 2],
    [60, 3], [69, 3], [70, 4], [100, 5],
  ])('berechnet für %i maßgebliche Arbeitsplätze %i Pflichtplätze', (workplaces, expected) => {
    expect(requiredQuotaPlaces(workplaces)).toBe(expected);
  });

  it('zählt nur aktuell beschäftigte, anrechenbar erfasste Personen', () => {
    const result = calculateEmploymentQuota(40, [
      person('sb'),
      person('gleichgestellt', { protectionStatus: 'equivalent' }),
      person('ausgeschieden', { employmentState: 'left_company' }),
      person('ungeklärt', { protectionStatus: 'unclear' }),
      person('abgelaufen', { statusValidUntil: '2026-10-07' }),
      person('künftig', { statusValidFrom: '2026-10-09' }),
      person('anonym', { recordKind: 'pseudonymous_request' }),
    ], '2026-10-08');

    expect(result).toMatchObject({ workplaces: 40, requiredPlaces: 2, recordedPersons: 2, openPlaces: 0, status: 'recorded_target_met' });
    expect(result.recordedRatePercent).toBe(5);
  });

  it('zeigt bei weniger als 20 Arbeitsplätzen keine Beschäftigungspflicht', () => {
    expect(calculateEmploymentQuota(19, [], '2026-10-08')).toMatchObject({ requiredPlaces: 0, status: 'no_obligation' });
  });

  it('meldet offene Plätze ohne aus der Momentaufnahme eine Jahresmeldung zu machen', () => {
    expect(calculateEmploymentQuota(70, [person('sb')], '2026-10-08')).toMatchObject({ requiredPlaces: 4, recordedPersons: 1, openPlaces: 3, status: 'recorded_target_open' });
  });
});
