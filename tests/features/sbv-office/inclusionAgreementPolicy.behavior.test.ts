import { describe, expect, it } from 'vitest';
import { REQUIRED_INCLUSION_TOPICS, inclusionAgreementClosureState, missingInclusionTopics } from '../../../services/inclusionAgreementPolicy';

describe('inclusion agreement policy', () => {
  it('requires every configured § 166 topic to remain visible until handled', () => {
    expect(REQUIRED_INCLUSION_TOPICS).toHaveLength(11);
    const missing = missingInclusionTopics(['personnel_planning']);
    expect(missing).toHaveLength(10);
    expect(missing).toContain('prevention_bem_health');
  });

  it('does not allow the closing state before signing and both transmissions are documented', () => {
    expect(inclusionAgreementClosureState({ signedAt: '2026-08-01' }).canClose).toBe(false);
    expect(inclusionAgreementClosureState({ signedAt: '2026-08-01', sentAgencyAt: '2026-08-02', sentIntegrationOfficeAt: '2026-08-02' })).toMatchObject({ canClose: true });
  });
});
