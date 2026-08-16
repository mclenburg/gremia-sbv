import { describe, expect, it } from 'vitest';
import { EMPLOYER_OBLIGATION_POLICY, annualReportDueAt, inclusionOfficerFinding } from '../../../services/employerObligationPolicy';

describe('employer obligation policy', () => {
  it('creates the § 163 annual employer deadline for the previous reporting year on 31 March', () => {
    expect(annualReportDueAt(2026)).toBe('2027-03-31T23:59:59.000Z');
    expect(EMPLOYER_OBLIGATION_POLICY.employment_report_163_2.cadence).toBe('annual');
  });

  it('keeps election-result notification event based and exposes a missing inclusion officer as an open finding', () => {
    expect(EMPLOYER_OBLIGATION_POLICY.sbv_election_result_notification_163_8.cadence).toBe('event');
    expect(inclusionOfficerFinding('not_appointed')).toBe('open');
    expect(inclusionOfficerFinding('appointed')).toBe('ok');
  });
});
