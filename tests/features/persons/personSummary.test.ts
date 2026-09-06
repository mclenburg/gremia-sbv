import { describe, expect, it } from 'vitest';
import type { ProtectedPersonRecord } from '../../../src/domain/models/protected-person.model';
import { summarizePersonDirectory } from '../../../src/app/features/persons/personSummary';

function person(id: string, overrides: Partial<ProtectedPersonRecord>): ProtectedPersonRecord {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    firstName: id,
    lastName: 'Test',
    employmentState: 'active_employee',
    protectionStatus: 'unclear',
    statusSource: 'manual',
    lifecycleState: 'active',
    ...overrides,
  };
}

describe('Personenverzeichnis Kennzahlen', () => {
  it('zählt Schwerbehinderte, Gleichgestellte und prüfbedürftige Status getrennt', () => {
    expect(summarizePersonDirectory([
      person('sb', { protectionStatus: 'severely_disabled' }),
      person('eq', { protectionStatus: 'equivalent' }),
      person('pending', { protectionStatus: 'application_pending' }),
      person('expired', { protectionStatus: 'expired', employmentState: 'left_company' }),
    ])).toEqual({
      total: 4,
      severelyDisabled: 1,
      equivalent: 1,
      pendingOrUnclear: 2,
      leftCompany: 1,
    });
  });
});
