import type { OfficeType } from './election.model.js';

export interface ElectionMailBallotRecord {
  id: string;
  electionId: string;
  voterId: string;
  requestedAt?: string;
  sentAt?: string;
  receivedAt?: string;
  declarationValid?: boolean;
  transferredToUrnAt?: string;
  lateReceivedAt?: string;
  destroyDueAt?: string;
  destroyedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveElectionMailBallotInput {
  voterId: string;
  requestedAt?: string;
  sentAt?: string;
  receivedAt?: string;
  declarationValid?: boolean;
  transferredToUrnAt?: string;
  lateReceivedAt?: string;
  announcementDate?: string;
  destroyedAt?: string;
}

export interface ElectionVoteTotalRecord {
  id: string;
  electionId: string;
  officeType: OfficeType;
  candidateId: string;
  votes: number;
  rank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordElectionTotalsInput {
  officeType: OfficeType;
  validBallots: number;
  invalidBallots: number;
  publicCountConfirmed: boolean;
  candidateVotes: Array<{ candidateId: string; votes: number }>;
  correctionReason?: string;
}

export interface ElectionResultRecord {
  id: string;
  electionId: string;
  officeType: OfficeType;
  candidateId: string;
  electedRank?: number;
  lotRequired: boolean;
  lotDecidedAt?: string;
  notifiedAt?: string;
  responseDueAt?: string;
  acceptanceStatus: 'pending' | 'accepted_by_silence' | 'accepted_explicit' | 'rejected' | 'replaced';
  createdAt: string;
  updatedAt: string;
}

export interface RecordElectionLotInput {
  officeType: OfficeType;
  candidateId: string;
  decidedAt: string;
}

export interface RecordElectionAcceptanceInput {
  resultId: string;
  notifiedAt?: string;
  responseAt?: string;
  status: 'accepted_by_silence' | 'accepted_explicit' | 'rejected';
}

export interface ElectionDayChecklistInput {
  secretMarkingConfirmed: boolean;
  ballotBoxSecured: boolean;
  electionBodyStaffingConfirmed: boolean;
  helperRuleAvailable: boolean;
  publicCountPrepared: boolean;
  recordedAt: string;
}

export interface ElectionPhysicalRecord {
  id: string;
  electionId: string;
  recordType: string;
  description?: string;
  quantity: number;
  storageLocation?: string;
  sealedStatus?: string;
  originalRequired: boolean;
  handedOverAt?: string;
  handedOverTo?: string;
  notesMinimal?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveElectionPhysicalRecordInput {
  id?: string;
  recordType: string;
  description?: string;
  quantity?: number;
  storageLocation?: string;
  sealedStatus?: string;
  originalRequired?: boolean;
  handedOverAt?: string;
  handedOverTo?: string;
  notesMinimal?: string;
}

export interface ElectionExecutionOverview {
  mailBallots: ElectionMailBallotRecord[];
  voteTotals: ElectionVoteTotalRecord[];
  results: ElectionResultRecord[];
  physicalRecords: ElectionPhysicalRecord[];
  events: Array<{ eventType: string; occurredAt: string; metadata: Record<string, unknown> }>;
}

export type ElectionExecutionDocumentKind =
  | 'ballot_representative'
  | 'ballot_deputy'
  | 'mail_ballot_package'
  | 'election_day_checklist'
  | 'result_minutes'
  | 'elected_notification'
  | 'result_announcement'
  | 'physical_inventory'
  | 'handover_protocol'
  | 'archive_pdf';

export interface GenerateElectionExecutionDocumentInput {
  kind: ElectionExecutionDocumentKind;
  resultId?: string;
}

export interface ElectionCloseInput {
  announcementStartedAt: string;
  announcementEndedAt: string;
  employerNotifiedAt: string;
  councilNotifiedAt: string;
  retentionUntil: string;
  challengePending?: boolean;
}

export interface ElectionTransferInspection {
  packageId: string;
  electionId: string;
  createdAt: string;
  formatVersion: number;
  legalRuleVersion: string;
  itemCount: number;
  manifestHash: string;
}

export interface ElectionDocumentExportResult {
  exported: boolean;
  fileName: string;
  sizeBytes: number;
}

export interface ElectionTransferFileExportResult extends ElectionTransferInspection {
  exported: boolean;
  fileName: string;
}

export type ElectionTransferFileSelection =
  | { canceled: true }
  | { canceled: false; fileToken: string; fileName: string; inspection: ElectionTransferInspection };
