export const ELECTION_PROCEDURES = ['formal', 'simplified'] as const;
export type ElectionProcedure = (typeof ELECTION_PROCEDURES)[number];

export const ELECTION_KINDS = [
  'regular',
  'extraordinary_no_sbv',
  'extraordinary_office_end',
  'extraordinary_successful_challenge',
  'deputy_by_election',
] as const;
export type ElectionKind = (typeof ELECTION_KINDS)[number];

export const ELECTION_STATUSES = [
  'draft',
  'procedure_confirmed',
  'preparation',
  'nominations',
  'ballots_ready',
  'voting',
  'counting',
  'acceptance_pending',
  'result_final',
  'announced',
  'closed',
  'cancelled',
] as const;
export type ElectionStatus = (typeof ELECTION_STATUSES)[number];

export const ELIGIBILITY_BASES = [
  'severely_disabled_confirmed',
  'equalized_confirmed',
  'pending_equalization_not_eligible',
  'not_eligible_other',
] as const;
export type EligibilityBasis = (typeof ELIGIBILITY_BASES)[number];

export const OFFICE_TYPES = ['representative', 'deputy'] as const;
export type OfficeType = (typeof OFFICE_TYPES)[number];

export const PROPOSAL_STATUSES = ['received', 'correction_required', 'valid', 'invalid', 'grace_period'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const ACCEPTANCE_STATUSES = [
  'pending',
  'accepted_by_silence',
  'accepted_explicit',
  'rejected',
  'replaced',
] as const;
export type AcceptanceStatus = (typeof ACCEPTANCE_STATUSES)[number];

export const ELECTION_DOCUMENT_CLASSES = [
  'generated_document',
  'scanned_copy',
  'external_document',
  'original_physical_reference',
] as const;
export type ElectionDocumentClass = (typeof ELECTION_DOCUMENT_CLASSES)[number];

export const ELECTION_TRANSFER_STATUSES = [
  'prepared',
  'exported',
  'inspected',
  'imported',
  'rejected',
  'superseded',
] as const;
export type ElectionTransferStatus = (typeof ELECTION_TRANSFER_STATUSES)[number];

export const ELECTION_LEGAL_RULE_VERSION = 'SGBIX-2026-01-16|SchwbVWO-2022-03-18' as const;

export interface MinimumThresholdAssessment {
  eligibleCount: number;
  minimumRequired: 5;
  thresholdMet: boolean;
  legalRuleVersion: typeof ELECTION_LEGAL_RULE_VERSION;
}

export interface ElectionProcedureSuggestion {
  suggestedProcedure: ElectionProcedure;
  eligibleCountSnapshot: number;
  spatiallySeparated: boolean;
  legalRuleVersion: typeof ELECTION_LEGAL_RULE_VERSION;
}

export interface CandidateEligibilityInput {
  ageOnElectionDay: number;
  monthsInOperation: number;
  operationAgeMonths: number;
  excludedFromRepresentativeBodyByLaw: boolean;
  notTemporaryEmployment: boolean;
}

export interface CandidateEligibilityAssessment {
  ageRequirementMet: boolean;
  tenureRequirementMet: boolean;
  representativeBodyRequirementMet: boolean;
  employmentRequirementMet: boolean;
  eligible: boolean;
}

export interface ElectionVoteTotalInput {
  candidateId: string;
  officeType: OfficeType;
  votes: number;
}

export interface ElectionVoteRanking {
  candidateId: string;
  officeType: OfficeType;
  votes: number;
  provisionalRank: number;
  lotRequired: boolean;
}

export const ELECTION_DEADLINE_RULE_KEYS = [
  'formal.board.appoint',
  'formal.election.target',
  'formal.notice.publish',
  'formal.voterlist.objection',
  'formal.proposal.submit',
  'formal.proposal.correction',
  'formal.proposal.grace',
  'formal.candidates.publish',
  'result.acceptance',
  'result.announcement',
  'mailballot.late.destroy',
  'simplified.invitation',
  'meeting.suspension',
  'employer.report',
  'election.records.retain',
] as const;
export type ElectionDeadlineRuleKey = (typeof ELECTION_DEADLINE_RULE_KEYS)[number];

export interface LegalDeadlineSnapshot {
  ruleKey: ElectionDeadlineRuleKey;
  sourceDate: string;
  dueAt: string;
  legalReference: string;
  legalRuleVersion: typeof ELECTION_LEGAL_RULE_VERSION;
  calculationBasis: string;
}

export interface ElectionDeadlineRuleSnapshot {
  ruleKey: ElectionDeadlineRuleKey;
  sourceDate: string;
  originalDueOn: string;
  dueOn: string;
  legalReference: string;
  calculationBasis: string;
  legalRuleVersion: typeof ELECTION_LEGAL_RULE_VERSION;
  manualCorrectionReason?: string;
}
