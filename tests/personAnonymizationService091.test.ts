import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('personAnonymizationService 0.9.1 integration contract', () => {
  it('setzt bei Personenanonymisierung ein Pseudonym-Label statt Ersatznamen', () => {
    const source = readFileSync('services/protectedPersonService.ts', 'utf8');
    expect(source).toContain('pseudonym_label = ?');
    expect(source).toContain("record_kind = 'pseudonymous_request'");
    expect(source).not.toContain("first_name = 'Anonymisierte'");
    expect(source).not.toContain('Anonymisierte Person ${hashStableId');
  });

  it('bildet Personenlöschung als person_deleted und linked_person_deleted ab', () => {
    const source = readFileSync('services/personAnonymizationService.ts', 'utf8');
    expect(source).toContain('deleteStructuredPersonData');
    expect(source).toContain('person_deleted');
    expect(source).toContain('linked_person_deleted');
    expect(source).toContain('DELETE FROM protected_persons');
  });
});
