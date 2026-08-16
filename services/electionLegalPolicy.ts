import {
  ELECTION_LEGAL_RULE_VERSION,
  type CandidateEligibilityAssessment,
  type CandidateEligibilityInput,
  type ElectionProcedureSuggestion,
  type ElectionVoteRanking,
  type ElectionVoteTotalInput,
  type EligibilityBasis,
  type MinimumThresholdAssessment,
  type OfficeType,
} from '../src/app/core/models/election.model.js';

const MINIMUM_ELECTION_THRESHOLD = 5;
const SIMPLIFIED_PROCEDURE_MAX_EXCLUSIVE = 50;
const REGULAR_ELECTION_ANCHOR_YEAR = 2026;

function assertNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} muss eine nichtnegative ganze Zahl sein.`);
  return value;
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) throw new Error('Datum muss als ISO-Datum vorliegen.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error('Datum ist ungültig.');
  }
  return date;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function regularElectionYear(year: number): boolean {
  return (year - REGULAR_ELECTION_ANCHOR_YEAR) % 4 === 0;
}

function nextRegularElectionYearAfter(reference: Date): number {
  let year = reference.getUTCFullYear();
  const currentPeriodEnd = Date.UTC(year, 10, 30);
  if (!regularElectionYear(year) || reference.getTime() > currentPeriodEnd) year += 1;
  while (!regularElectionYear(year)) year += 1;
  if (year === reference.getUTCFullYear() && reference.getTime() >= Date.UTC(year, 9, 1)) year += 4;
  return year;
}

export interface RegularElectionPeriod {
  year: number;
  startsOn: string;
  endsOn: string;
}

export class ElectionLegalPolicy {
  readonly legalRuleVersion = ELECTION_LEGAL_RULE_VERSION;

  assessMinimumThreshold(eligibility: readonly EligibilityBasis[]): MinimumThresholdAssessment {
    const eligibleCount = eligibility.filter((basis) => basis === 'severely_disabled_confirmed' || basis === 'equalized_confirmed').length;
    return {
      eligibleCount,
      minimumRequired: MINIMUM_ELECTION_THRESHOLD,
      thresholdMet: eligibleCount >= MINIMUM_ELECTION_THRESHOLD,
      legalRuleVersion: ELECTION_LEGAL_RULE_VERSION,
    };
  }

  suggestProcedure(eligibleCountSnapshot: number, spatiallySeparated: boolean): ElectionProcedureSuggestion {
    const count = assertNonNegativeInteger(eligibleCountSnapshot, 'Zahl der Wahlberechtigten');
    return {
      suggestedProcedure: count < SIMPLIFIED_PROCEDURE_MAX_EXCLUSIVE && !spatiallySeparated ? 'simplified' : 'formal',
      eligibleCountSnapshot: count,
      spatiallySeparated,
      legalRuleVersion: ELECTION_LEGAL_RULE_VERSION,
    };
  }

  isRegularElectionDate(value: string): boolean {
    const date = parseDateOnly(value);
    const year = date.getUTCFullYear();
    if (!regularElectionYear(year)) return false;
    const time = date.getTime();
    return time >= Date.UTC(year, 9, 1) && time <= Date.UTC(year, 10, 30);
  }

  calculateNextRegularElectionPeriod(termStart: string): RegularElectionPeriod {
    const start = parseDateOnly(termStart);
    let year = nextRegularElectionYearAfter(start);
    const nextPeriodStart = new Date(Date.UTC(year, 9, 1));
    const oneYearAfterTermStart = new Date(start.getTime());
    oneYearAfterTermStart.setUTCFullYear(oneYearAfterTermStart.getUTCFullYear() + 1);
    if (nextPeriodStart.getTime() < oneYearAfterTermStart.getTime()) year += 4;
    return { year, startsOn: `${year}-10-01`, endsOn: `${year}-11-30` };
  }

  requiredSupportSignatures(eligibleCount: number): number {
    const count = assertNonNegativeInteger(eligibleCount, 'Zahl der Wahlberechtigten');
    return Math.max(3, Math.ceil(count / 20));
  }

  assessCandidateEligibility(input: CandidateEligibilityInput): CandidateEligibilityAssessment {
    const ageRequirementMet = input.ageOnElectionDay >= 18;
    const tenureRequirementMet = input.operationAgeMonths < 12 || input.monthsInOperation >= 6;
    const representativeBodyRequirementMet = !input.excludedFromRepresentativeBodyByLaw;
    const employmentRequirementMet = input.notTemporaryEmployment;
    return {
      ageRequirementMet,
      tenureRequirementMet,
      representativeBodyRequirementMet,
      employmentRequirementMet,
      eligible: ageRequirementMet && tenureRequirementMet && representativeBodyRequirementMet && employmentRequirementMet,
    };
  }

  rankVoteTotals(totals: readonly ElectionVoteTotalInput[]): ElectionVoteRanking[] {
    for (const total of totals) {
      assertNonNegativeInteger(total.votes, 'Stimmenzahl');
    }
    const result: ElectionVoteRanking[] = [];
    for (const officeType of ['representative', 'deputy'] as const satisfies readonly OfficeType[]) {
      const officeTotals = totals
        .filter((item) => item.officeType === officeType)
        .slice()
        .sort((a, b) => b.votes - a.votes || a.candidateId.localeCompare(b.candidateId));
      const countsByVotes = new Map<number, number>();
      for (const item of officeTotals) countsByVotes.set(item.votes, (countsByVotes.get(item.votes) ?? 0) + 1);
      let previousVotes: number | undefined;
      let rank = 0;
      officeTotals.forEach((item, index) => {
        if (previousVotes === undefined || item.votes !== previousVotes) rank = index + 1;
        result.push({
          candidateId: item.candidateId,
          officeType,
          votes: item.votes,
          provisionalRank: rank,
          lotRequired: (countsByVotes.get(item.votes) ?? 0) > 1,
        });
        previousVotes = item.votes;
      });
    }
    return result;
  }
}

export function regularElectionPeriodForYear(year: number): RegularElectionPeriod | null {
  if (!Number.isInteger(year) || !regularElectionYear(year)) return null;
  return { year, startsOn: dateOnly(new Date(Date.UTC(year, 9, 1))), endsOn: dateOnly(new Date(Date.UTC(year, 10, 30))) };
}
