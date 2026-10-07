import type {
  ActivityJournalCategory, ActivityJournalContextType, ActivityJournalPrefill, CreateActivityJournalEntryInput,
} from '../../../domain/models/activity-journal.model';
import { legalToday } from './activityJournalTimeSuggestion';

export type ActivityJournalFormState = {
  title: string;
  description: string;
  resultNote: string;
  entryDate: string;
  category: ActivityJournalCategory;
  timeMode: 'none' | 'duration' | 'range';
  durationMinutes: string;
  startedAt: string;
  endedAt: string;
  status: 'draft' | 'final' | 'follow_up_open';
  followUpDueAt: string;
  performedOutsideContractWorkTime: boolean;
  preferenceContextType: ActivityJournalContextType;
};

export function createEmptyActivityJournalForm(): ActivityJournalFormState {
  return {
    title: '',
    description: '',
    resultNote: '',
    entryDate: legalToday(),
    category: 'documentation',
    timeMode: 'duration',
    durationMinutes: '30',
    startedAt: '',
    endedAt: '',
    status: 'final',
    followUpDueAt: '',
    performedOutsideContractWorkTime: false,
    preferenceContextType: 'fallfrei',
  };
}

export function buildActivityJournalInput(form: ActivityJournalFormState): CreateActivityJournalEntryInput {
  return {
    title: form.title,
    description: form.description,
    resultNote: form.resultNote,
    entryDate: form.entryDate,
    category: form.category,
    timeMode: form.timeMode,
    durationMinutes: form.timeMode === 'duration' ? Number(form.durationMinutes) : undefined,
    startedAt: form.timeMode === 'range' ? form.startedAt : undefined,
    endedAt: form.timeMode === 'range' ? form.endedAt : undefined,
    status: form.status,
    followUpDueAt: form.followUpDueAt || undefined,
    performedOutsideContractWorkTime: form.performedOutsideContractWorkTime,
    confidentialityLevel: 'confidential',
    createdFrom: 'manual',
  };
}

export function formFromActivityJournalPrefill(prefill: ActivityJournalPrefill): ActivityJournalFormState {
  const entry = prefill.entry;
  return {
    title: entry.title ?? '',
    description: entry.description ?? '',
    resultNote: entry.resultNote ?? '',
    entryDate: entry.entryDate ?? legalToday(),
    category: entry.category ?? 'documentation',
    timeMode: entry.timeMode === 'range' ? 'range' : entry.timeMode === 'none' ? 'none' : 'duration',
    durationMinutes: entry.durationMinutes === undefined ? '' : String(entry.durationMinutes),
    startedAt: entry.startedAt ?? '',
    endedAt: entry.endedAt ?? '',
    status: entry.status ?? 'final',
    followUpDueAt: entry.followUpDueAt?.slice(0, 10) ?? '',
    performedOutsideContractWorkTime: Boolean(entry.performedOutsideContractWorkTime),
    preferenceContextType: prefill.preferenceContextType ?? 'fallfrei',
  };
}
