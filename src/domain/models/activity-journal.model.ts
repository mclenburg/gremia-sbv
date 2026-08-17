export type ActivityJournalTimeMode = 'none' | 'duration' | 'range' | 'timer';

export type ActivityJournalCategory =
  | 'case_work'
  | 'consultation'
  | 'bem_preparation'
  | 'prevention'
  | 'participation'
  | 'employer_meeting'
  | 'committee_work'
  | 'sbv_steering'
  | 'research'
  | 'documentation'
  | 'qualification'
  | 'external_network'
  | 'sbv_self_organization';

export type ActivityJournalConfidentialityLevel = 'normal' | 'confidential' | 'highly_confidential';
export type ActivityJournalStatus = 'draft' | 'final' | 'follow_up_open';
export type ActivityJournalCreatedFrom = 'manual' | 'text_command' | 'context_prefill' | 'timer' | 'import';

export type ActivityJournalTargetType =
  | 'case'
  | 'person'
  | 'bem_process'
  | 'prevention_process'
  | 'sbv_participation'
  | 'termination_hearing'
  | 'equalization_process'
  | 'sbv_control_protocol'
  | 'recruiting_participation'
  | 'recruiting_interview'
  | 'deadline'
  | 'document';

export type ActivityJournalContextType =
  | 'case'
  | 'person'
  | 'bem_process'
  | 'prevention_process'
  | 'sbv_participation'
  | 'termination_hearing'
  | 'equalization_process'
  | 'sbv_control_protocol'
  | 'recruiting_participation'
  | 'recruiting_interview'
  | 'deadline'
  | 'document'
  | 'journal'
  | 'fallfrei';

export interface ActivityJournalLinkTarget {
  targetType: ActivityJournalTargetType;
  targetId: string;
}

export interface ActivityJournalLinkRecord extends ActivityJournalLinkTarget {
  id: string;
  entryId: string;
  createdAt: string;
}

export interface ActivityJournalEntryRecord {
  id: string;
  entryDate: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  timeMode: ActivityJournalTimeMode;
  category: ActivityJournalCategory;
  title: string;
  description?: string;
  resultNote?: string;
  confidentialityLevel: ActivityJournalConfidentialityLevel;
  status: ActivityJournalStatus;
  createdFrom: ActivityJournalCreatedFrom;
  followUpDueAt?: string;
  performedOutsideContractWorkTime: boolean;
  exportedForActivityReportAt?: string;
  createdAt: string;
  updatedAt: string;
  links?: ActivityJournalLinkRecord[];
}

export interface CreateActivityJournalEntryInput {
  entryDate?: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  timeMode?: ActivityJournalTimeMode;
  category?: ActivityJournalCategory;
  title: string;
  description?: string;
  resultNote?: string;
  confidentialityLevel?: ActivityJournalConfidentialityLevel;
  status?: ActivityJournalStatus;
  createdFrom?: ActivityJournalCreatedFrom;
  followUpDueAt?: string;
  performedOutsideContractWorkTime?: boolean;
  links?: ActivityJournalLinkTarget[];
}

export type UpdateActivityJournalEntryInput = Partial<Omit<CreateActivityJournalEntryInput, 'links'>> & {
  links?: ActivityJournalLinkTarget[];
};

export interface ActivityJournalListFilter {
  search?: string;
  from?: string;
  to?: string;
  categories?: ActivityJournalCategory[];
  status?: ActivityJournalStatus[];
  targetType?: ActivityJournalTargetType;
  targetId?: string;
  hasTime?: boolean;
  hasFollowUp?: boolean;
  limit?: number;
}

export interface ActivityJournalSummaryFilter {
  from?: string;
  to?: string;
  categories?: ActivityJournalCategory[];
}

export interface ActivityJournalSummary {
  totalEntries: number;
  entriesWithTime: number;
  totalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  byCategory: Array<{ category: ActivityJournalCategory; count: number; minutes: number }>;
  byReferenceType: Array<{ referenceType: 'case_linked' | 'control_linked' | 'fallfrei' | 'other_linked'; count: number; minutes: number }>;
  openFollowUps: ActivityJournalEntryRecord[];
}

export interface ActivityJournalExportOptions {
  markAsExported?: boolean;
}

export interface ActivityJournalExportResult {
  generatedAt: string;
  mode: 'summary' | 'detailed';
  heading: string;
  notice: string;
  totalEntries: number;
  totalMinutes: number;
  text: string;
  entries: ActivityJournalEntryRecord[];
}

export interface ActivityJournalCategoryPreferenceRecord {
  contextType: ActivityJournalContextType;
  category: ActivityJournalCategory;
  updatedAt: string;
}

export interface ActivityJournalPrefillContext {
  contextType: ActivityJournalContextType;
  contextId?: string;
  caseId?: string;
  caseNumber?: string;
  title?: string;
  category?: ActivityJournalCategory;
  entryDate?: string;
  followUpDueAt?: string;
}

export interface ActivityJournalPrefill {
  entry: CreateActivityJournalEntryInput;
  sourceLabel: string;
  privacyNotice: string;
  preferenceContextType?: ActivityJournalContextType;
}

export const ACTIVITY_JOURNAL_CATEGORIES: ActivityJournalCategory[] = [
  'case_work',
  'consultation',
  'bem_preparation',
  'prevention',
  'participation',
  'employer_meeting',
  'committee_work',
  'sbv_steering',
  'research',
  'documentation',
  'qualification',
  'external_network',
  'sbv_self_organization'
];

export const ACTIVITY_JOURNAL_TARGET_TYPES: ActivityJournalTargetType[] = [
  'case',
  'person',
  'bem_process',
  'prevention_process',
  'sbv_participation',
  'termination_hearing',
  'equalization_process',
  'sbv_control_protocol',
  'recruiting_participation',
  'recruiting_interview',
  'deadline',
  'document'
];

export const ACTIVITY_JOURNAL_CONTEXT_TYPES: ActivityJournalContextType[] = [
  ...ACTIVITY_JOURNAL_TARGET_TYPES,
  'journal',
  'fallfrei'
];

export { activityJournalCategoryLabels as ACTIVITY_JOURNAL_CATEGORY_LABELS } from '../labels/activityJournalLabels';
