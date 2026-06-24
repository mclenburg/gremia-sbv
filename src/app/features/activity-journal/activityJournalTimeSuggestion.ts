import type { ActivityJournalFormState } from './hooks/useActivityJournal';

export type ActivityJournalTimeSuggestion = {
  startTime: string;
  endTime: string;
  minutes: number;
  startedAt: string;
  endedAt: string;
  label: string;
};

const START_TIME_ONLY_PATTERN = /^\s*(\d{1,2}:\d{2})\s*$/;

function padTime(value: string): string {
  const [hour = '0', minute = '00'] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function localDateTime(date: string, time: string): string {
  return `${date}T${padTime(time)}`;
}

function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function detectStartTimeOnly(value: string): string | null {
  const match = value.match(START_TIME_ONLY_PATTERN);
  if (!match) return null;
  const normalized = padTime(match[1]);
  const [hour, minute] = normalized.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  return normalized;
}

export function buildTimeSuggestionFromStartTime(input: {
  entryDate: string;
  value: string;
  now?: Date;
}): ActivityJournalTimeSuggestion | null {
  const startTime = detectStartTimeOnly(input.value);
  if (!startTime) return null;
  const now = input.now ?? new Date();
  const endTime = timeFromDate(now);
  const startedAt = localDateTime(input.entryDate, startTime);
  const endedAt = localDateTime(input.entryDate, endTime);
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const minutes = Math.round((end - start) / 60000);
  return {
    startTime,
    endTime,
    minutes,
    startedAt,
    endedAt,
    label: `Bis jetzt: ${startTime}-${endTime}, ${minutes} Minuten übernehmen?`,
  };
}

export function applyTimeSuggestion(form: ActivityJournalFormState, suggestion: ActivityJournalTimeSuggestion): ActivityJournalFormState {
  return {
    ...form,
    timeMode: 'range',
    durationMinutes: String(suggestion.minutes),
    startedAt: suggestion.startedAt,
    endedAt: suggestion.endedAt,
  };
}
