import type { ElectionKind, ElectionProcedure, ElectionStatus, EligibilityBasis, OfficeType, ProposalStatus } from './election.model.js';

export interface ElectionRecord {
  id: string;
  kind: ElectionKind;
  triggerReason?: string;
  procedure?: ElectionProcedure;
  procedureConfirmedAt?: string;
  procedureDecisionNote?: string;
  legalRuleVersion: string;
  status: ElectionStatus;
  electionDate?: string;
  incumbentTermEnd?: string;
  officeTermStart?: string;
  officeTermEnd?: string;
  nextRegularElectionPeriod?: string;
  eligibilityCheckDate?: string;
  eligibleDisabledEmployeeCount: number;
  minimumThresholdMet: boolean;
  eligibilityCheckBasis?: string;
  spatiallySeparated: boolean;
  eligibleCountSnapshot: number;
  deputyCount: number;
  deputyCountLockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateElectionInput {
  kind: ElectionKind;
  triggerReason?: string;
  incumbentTermEnd?: string;
  officeTermStart?: string;
  officeTermEnd?: string;
  electionDate?: string;
}

export interface ConfigureElectionSetupInput {
  eligibilityCheckDate: string;
  confirmedSeverelyDisabledCount: number;
  confirmedEqualizedCount: number;
  pendingEqualizationCount?: number;
  spatiallySeparated: boolean;
  procedure?: ElectionProcedure;
  procedureDecisionNote?: string;
  deputyCount?: number;
  electionDate?: string;
}

export interface ElectionSetupAssessment {
  eligibleCountSnapshot: number;
  minimumThresholdMet: boolean;
  suggestedProcedure: ElectionProcedure;
  selectedProcedure: ElectionProcedure;
  procedureDiffersFromSuggestion: boolean;
  regularElectionDateValid: boolean;
  startReady: boolean;
  legalRuleVersion: string;
}

export interface ElectionVoterRecord {
  id: string;
  electionId: string;
  lastName: string;
  firstName: string;
  birthDate?: string;
  orgUnit?: string;
  eligibilityBasis: EligibilityBasis;
  eligibilityVerifiedAt?: string;
  listStatus: string;
  createdAt: string;
  updatedAt: string;
}
export interface SaveElectionVoterInput {
  id?: string;
  lastName: string;
  firstName: string;
  birthDate?: string;
  orgUnit?: string;
  eligibilityBasis: EligibilityBasis;
  eligibilityVerifiedAt?: string;
  listStatus?: string;
}


export interface ElectionVoterSyncResult {
  eligiblePersons: number;
  created: number;
  updated: number;
  unchanged: number;
}

export interface ElectionVoterImportFileSelection {
  canceled: boolean;
  fileToken?: string;
  sourceFileName?: string;
  fileType?: 'csv' | 'xlsx';
}

export interface ElectionVoterFileImportInput {
  fileToken: string;
  sourceFileName: string;
  fileType: 'csv' | 'xlsx';
  csvEncoding?: 'auto' | 'utf-8' | 'windows-1252' | 'iso-8859-1' | 'cp850';
  sheetName?: string;
  delimiter?: string;
  headerRowIndex?: number;
  firstDataRowIndex?: number;
  mapping: import('./protected-person.model.js').PersonImportColumnMapping;
}

export interface ElectionVoterFileImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  warnings: string[];
}

export interface ElectionBoardMemberRecord {
  id: string;
  electionId: string;
  role: string;
  name: string;
  employedConfirmed: boolean;
  adultConfirmed: boolean;
  appointedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface SaveElectionBoardMemberInput {
  id?: string;
  role: 'chair' | 'member' | 'substitute' | 'election_leader' | 'assistant';
  name: string;
  employedConfirmed?: boolean;
  adultConfirmed?: boolean;
  appointedAt?: string;
}

export interface ElectionBoardSessionRecord {
  id: string;
  electionId: string;
  startsAt: string;
  participants: string[];
  decisionsText?: string;
  minutesDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface SaveElectionBoardSessionInput { startsAt: string; participants: string[]; decisionsText?: string; }

export interface ElectionObjectionRecord {
  id: string;
  electionId: string;
  receivedAt: string;
  subjectRef: string;
  decisionAt?: string;
  decision?: string;
  notifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface SaveElectionObjectionInput { id?: string; receivedAt: string; subjectRef: string; decisionAt?: string; decision?: string; notifiedAt?: string; }

export interface ElectionCandidateRecord {
  id: string;
  electionId: string;
  officeType: OfficeType;
  personSnapshot: string;
  birthDate?: string;
  occupation?: string;
  consentAt?: string;
  eligibilityStatus: string;
  createdAt: string;
  updatedAt: string;
}
export interface SaveElectionCandidateInput {
  id?: string;
  officeType: OfficeType;
  personSnapshot: string;
  birthDate?: string;
  occupation?: string;
  consentAt?: string;
  ageOnElectionDay: number;
  monthsInOperation: number;
  operationAgeMonths: number;
  excludedFromRepresentativeBodyByLaw: boolean;
  notTemporaryEmployment: boolean;
}

export interface ElectionProposalRecord {
  id: string;
  electionId: string;
  receivedAt: string;
  validityStatus: ProposalStatus;
  correctionDueAt?: string;
  invalidReason?: string;
  candidateIds: string[];
  supporterVoterIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface SaveElectionProposalInput {
  id?: string;
  receivedAt: string;
  validityStatus?: ProposalStatus;
  correctionDueAt?: string;
  invalidReason?: string;
  candidateIds?: string[];
  supporterVoterIds?: string[];
}

export interface ElectionPreparationOverview {
  election: ElectionRecord;
  voters: ElectionVoterRecord[];
  boardMembers: ElectionBoardMemberRecord[];
  boardSessions: ElectionBoardSessionRecord[];
  candidates: ElectionCandidateRecord[];
  proposals: ElectionProposalRecord[];
  objections: ElectionObjectionRecord[];
  conflicts: string[];
}

export type ElectionPreparationDocumentKind =
  | 'setup_summary' | 'board_appointment' | 'board_minutes' | 'voter_list' | 'election_notice'
  | 'proposal_correction_notice' | 'proposal_grace_notice' | 'candidate_announcement'
  | 'simplified_invitation' | 'election_leadership_minutes';

export interface ElectionNoticeDetails {
  issueDate: string;
  votingStartsAt: string;
  votingEndsAt: string;
  votingPlace: string;
  countingPlaceAndTime: string;
  voterListInspectionPlace: string;
  voterListInspectionTimes: string;
  objectionDeadline: string;
  proposalDeadline: string;
  proposalSubmissionPlace: string;
  representativeElectionStatement: string;
  deputyElectionStatement: string;
  requiredSupportSignatures: string;
  mailBallotStatement: string;
  boardChairName: string;
  secondBoardMemberName: string;
}
export interface ElectionInvitationDetails {
  meetingStartsAt: string;
  meetingPlace: string;
  accessibilityNote?: string;
}
export interface GenerateElectionPreparationDocumentInput { kind: ElectionPreparationDocumentKind; boardSessionId?: string; notice?: ElectionNoticeDetails; invitation?: ElectionInvitationDetails; titleOverride?: string; }
