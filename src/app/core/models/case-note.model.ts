import type { CaseNoteLinkRecord, CreateCaseNoteLinkInput } from './case-note-link.model';

export type CaseNoteType =
  | 'gespraech'
  | 'protokoll'
  | 'telefonat'
  | 'videocall'
  | 'email'
  | 'bem'
  | 'anhoerung'
  | 'interne_notiz'
  | 'sonstiges';

export type ConfidentialLevel = 'normal' | 'sensibel' | 'hoch_sensibel';

export interface CaseNoteRecord {
  id: string;
  caseId: string;
  caseNumber?: string;
  caseIds: string[];
  caseNumbers: string[];
  title: string;
  noteDate: string;
  noteType: CaseNoteType;
  participants?: string;
  content: string;
  nextSteps?: string;
  containsHealthData: boolean;
  confidentialLevel: ConfidentialLevel;
  createdAt: string;
  updatedAt: string;
  links?: CaseNoteLinkRecord[];
}

export interface CreateCaseNoteInput {
  caseId: string;
  caseIds?: string[];
  title: string;
  noteDate?: string;
  noteType: CaseNoteType;
  participants?: string;
  content: string;
  nextSteps?: string;
  containsHealthData?: boolean;
  confidentialLevel?: ConfidentialLevel;
  links?: CreateCaseNoteLinkInput[];
}

export interface UpdateCaseNoteInput {
  caseIds?: string[];
  title?: string;
  noteDate?: string;
  noteType?: CaseNoteType;
  participants?: string;
  content?: string;
  nextSteps?: string;
  containsHealthData?: boolean;
  confidentialLevel?: ConfidentialLevel;
  links?: CreateCaseNoteLinkInput[];
}

export type CaseSearchSourceType = 'note' | 'document';

export interface CaseSearchResult {
  sourceType: CaseSearchSourceType;
  sourceId: string;
  caseId: string;
  caseNumber?: string;
  caseNumbers?: string[];
  title: string;
  excerpt: string;
  date?: string;
  rank: number;
}

export interface CaseContentSearchInput {
  query: string;
  caseId?: string;
  limit?: number;
}
