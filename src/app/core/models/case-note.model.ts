import type { CaseNoteLinkRecord, CreateCaseNoteLinkInput } from './case-note-link.model';
import type { CreateDeadlineInput } from './deadline.model';
import type { CreateBemProcessInput } from './bem.model';
import type { CreatePreventionProcessInput } from './prevention.model';
import type { CreateParticipationInput } from './participation.model';
import type { CreateEqualizationProcessInput } from './equalization.model';
import type { CreateWorkplaceAccommodationInput } from './workplace-accommodation.model';
import type { CreateTerminationHearingInput } from './termination.model';
import type { CreateContactInput } from './contact.model';

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


export type CaseNoteInlineActionInput =
  | { kind: 'contact'; input: CreateContactInput }
  | { kind: 'legal_norm_case_link'; input: { caseId: string; legalNormId: string; note?: string }; displayLabel: string }
  | { kind: 'deadline'; input: CreateDeadlineInput; linkLabel?: string; accessibleLabel?: string }
  | { kind: 'bem'; input: CreateBemProcessInput; linkLabel: string; accessibleLabel: string }
  | { kind: 'prevention'; input: CreatePreventionProcessInput; linkLabel: string; accessibleLabel: string }
  | { kind: 'participation'; input: CreateParticipationInput; linkLabel: string; accessibleLabel: string }
  | { kind: 'equalization'; input: CreateEqualizationProcessInput; linkLabel: string; accessibleLabel: string }
  | { kind: 'workplace_accommodation'; input: CreateWorkplaceAccommodationInput; linkLabel: string; accessibleLabel: string }
  | { kind: 'termination_hearing'; input: CreateTerminationHearingInput; linkLabel: string; accessibleLabel: string };

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
  inlineActions?: CaseNoteInlineActionInput[];
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
  inlineActions?: CaseNoteInlineActionInput[];
}

export type CaseSearchSourceType =
  | 'case'
  | 'note'
  | 'document'
  | 'document_ocr'
  | 'measure_note'
  | 'bem'
  | 'bem_event'
  | 'prevention'
  | 'prevention_event'
  | 'termination'
  | 'equalization'
  | 'participation'
  | 'participation_event'
  | 'measure'
  | 'measure_event'
  | 'workplace_accommodation';

export interface CaseSearchHighlightSegment {
  text: string;
  match: boolean;
}

export interface CaseSearchResult {
  sourceType: CaseSearchSourceType;
  sourceId: string;
  sourceLabel?: string;
  caseId: string;
  caseNumber?: string;
  caseNumbers?: string[];
  title: string;
  excerpt: string;
  excerptSegments?: CaseSearchHighlightSegment[];
  extractionQuality?: 'structured' | 'native_text' | 'ocr' | 'manual' | 'unknown';
  navigationKind?: 'case' | 'note' | 'document' | 'measure' | 'process';
  navigationId?: string;
  navigationSubId?: string;
  date?: string;
  rank: number;
}

export interface CaseContentSearchInput {
  query: string;
  caseId?: string;
  limit?: number;
  sourceTypes?: CaseSearchSourceType[];
}
