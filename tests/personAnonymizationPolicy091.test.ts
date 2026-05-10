import { describe, expect, it } from 'vitest';
import { assertPersonPrivacyReason, buildAnonymizedPersonLabel, decidePersonDeletion, decideStructuredPersonAnonymization } from '../services/personAnonymizationPolicy';

describe('personAnonymizationPolicy 0.9.1', () => {
  it('erzeugt anonymisierte Personen ohne Direktidentifikatoren und mit Pseudonym-Label', () => {
    const decision = decideStructuredPersonAnonymization('person-123');
    expect(decision.pseudonymLabel).toMatch(/^Anonymisierte Person #[a-f0-9]{12}$/);
    expect(decision.firstName).toBe('');
    expect(decision.lastName).toBe('');
    expect(decision.personnelNumber).toBeNull();
    expect(decision.workEmail).toBeNull();
    expect(decision.organizationalUnit).toBeNull();
    expect(decision.location).toBeNull();
    expect(decision.notes).toBeNull();
    expect(decision.lifecycleState).toBe('anonymized');
    expect(buildAnonymizedPersonLabel('person-123')).toBe(decision.pseudonymLabel);
  });

  it('validiert Gründe und modelliert Personenlöschung als Datenschutzprüffall', () => {
    expect(assertPersonPrivacyReason(' Zweckfortfall ')).toBe('Zweckfortfall');
    expect(() => assertPersonPrivacyReason('  ')).toThrow(/Grund/);
    expect(decidePersonDeletion()).toEqual({
      caseBindingState: 'person_deleted',
      privacyReviewReason: 'linked_person_deleted',
      reviewRequired: true
    });
  });
});
