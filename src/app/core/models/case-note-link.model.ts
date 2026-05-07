export type CaseNoteLinkTargetType =
  | 'bem'
  | 'prevention'
  | 'participation'
  | 'termination_hearing'
  | 'equalization'
  | 'workplace_accommodation'
  | 'deadline';

export interface CaseNoteLinkRecord {
  id: string;
  caseNoteId: string;
  targetType: CaseNoteLinkTargetType;
  targetId: string;
  caseId: string;
  label: string;
  accessibleLabel: string;
  textStart: number;
  textEnd: number;
  createdAt: string;
  isMissingTarget?: boolean;
}

export interface CreateCaseNoteLinkInput {
  targetType: CaseNoteLinkTargetType;
  targetId: string;
  caseId: string;
  label: string;
  accessibleLabel?: string;
  textStart: number;
  textEnd: number;
}
