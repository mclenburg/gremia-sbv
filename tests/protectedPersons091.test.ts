import { describe, expect, it } from 'vitest';
import { decidePersonLifecycleTransition } from '../services/personLifecyclePolicy';
import type { ProtectedPersonRecord } from '../src/app/core/models/protected-person.model';

function person(statusValidUntil: string, lifecycleState: ProtectedPersonRecord['lifecycleState'] = 'active'): ProtectedPersonRecord {
  return {
    id: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    firstName: 'Max',
    lastName: 'Mustermann',
    employmentState: 'active_employee',
    protectionStatus: 'equivalent',
    statusValidUntil,
    statusSource: 'employer_list',
    lifecycleState
  };
}

describe('0.9.1 Personenverzeichnis Lifecycle', () => {
  it('entscheidet 30-Tage-Warnung und Datenschutzprüfung deterministisch als Policy', () => {
    const reference = new Date('2026-05-10T00:00:00.000Z');

    expect(decidePersonLifecycleTransition(person('2026-06-09'), reference, 30)?.lifecycleState).toBe('expiring_soon');
    const expired = decidePersonLifecycleTransition(person('2026-05-09'), reference, 30);
    expect(expired?.lifecycleState).toBe('expired_review_required');
    expect(expired?.protectionStatus).toBe('expired');
    expect(decidePersonLifecycleTransition(person('2026-06-10'), reference, 30)).toBeNull();
  });

  it('ändert anonymisierte Personen nicht automatisch erneut', () => {
    const decision = decidePersonLifecycleTransition(person('2026-05-09', 'anonymized'), new Date('2026-05-10T00:00:00.000Z'), 30);
    expect(decision).toBeNull();
  });
});
