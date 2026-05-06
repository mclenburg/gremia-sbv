export type CaseNoteLinkTargetType = 'bem' | 'participation' | 'deadline';

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
