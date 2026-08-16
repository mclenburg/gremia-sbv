import { describe, expect, it } from 'vitest';
import { ElectionLegalPolicy } from '../../../services/electionLegalPolicy';

describe('ElectionLegalPolicy', () => {
  const policy = new ElectionLegalPolicy();

  it('counts only confirmed severe disability or confirmed equalization for the five-person threshold', () => {
    const result = policy.assessMinimumThreshold([
      'severely_disabled_confirmed', 'equalized_confirmed', 'severely_disabled_confirmed',
      'equalized_confirmed', 'pending_equalization_not_eligible', 'not_eligible_other',
    ]);
    expect(result).toMatchObject({ eligibleCount: 4, minimumRequired: 5, thresholdMet: false });
    expect(policy.assessMinimumThreshold([...Array(5)].map(() => 'severely_disabled_confirmed'))).toMatchObject({ eligibleCount: 5, thresholdMet: true });
  });

  it('suggests simplified procedure only below fifty eligible employees and without spatial separation', () => {
    expect(policy.suggestProcedure(49, false).suggestedProcedure).toBe('simplified');
    expect(policy.suggestProcedure(50, false).suggestedProcedure).toBe('formal');
    expect(policy.suggestProcedure(12, true).suggestedProcedure).toBe('formal');
  });

  it('applies candidate eligibility and the short-operation tenure exception', () => {
    expect(policy.assessCandidateEligibility({ ageOnElectionDay: 18, monthsInOperation: 1, operationAgeMonths: 11, excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true }).eligible).toBe(true);
    expect(policy.assessCandidateEligibility({ ageOnElectionDay: 17, monthsInOperation: 12, operationAgeMonths: 48, excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true }).eligible).toBe(false);
    expect(policy.assessCandidateEligibility({ ageOnElectionDay: 30, monthsInOperation: 5, operationAgeMonths: 48, excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true }).eligible).toBe(false);
  });

  it('keeps representative and deputy rankings separate and requires a documented lot for ties', () => {
    const ranked = policy.rankVoteTotals([
      { candidateId: 'r1', officeType: 'representative', votes: 10 },
      { candidateId: 'r2', officeType: 'representative', votes: 10 },
      { candidateId: 'd1', officeType: 'deputy', votes: 99 },
    ]);
    expect(ranked.filter((item) => item.officeType === 'representative')).toEqual([
      { candidateId: 'r1', officeType: 'representative', votes: 10, provisionalRank: 1, lotRequired: true },
      { candidateId: 'r2', officeType: 'representative', votes: 10, provisionalRank: 1, lotRequired: true },
    ]);
    expect(ranked.find((item) => item.candidateId === 'd1')).toMatchObject({ provisionalRank: 1, lotRequired: false });
  });
});
