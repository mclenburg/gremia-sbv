import { describe, expect, it } from 'vitest';
import { inclusionAgreementClosureState } from '../../../services/inclusionAgreementPolicy';

describe('inclusion agreement policy', () => {
  it('does not allow the closing state before signing and both transmissions are documented', () => {
    expect(inclusionAgreementClosureState({ signedAt: '2026-08-01' }).canClose).toBe(false);
    expect(inclusionAgreementClosureState({ signedAt: '2026-08-01', sentAgencyAt: '2026-08-02', sentIntegrationOfficeAt: '2026-08-02' })).toMatchObject({ canClose: true });
  });
});
