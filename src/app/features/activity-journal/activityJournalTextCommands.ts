import type { ActivityJournalFormState } from './hooks/useActivityJournal';

export type ActivityJournalCommandApplyResult = {
  form: ActivityJournalFormState;
  changed: boolean;
};

function minutesFromDurationToken(value: string): number | null {
  const match = value.trim().match(/^(\d{1,3})(?:\s*(?:m|min|minute|minuten))?$/i);
  if (!match) return null;
  const minutes = Number(match[1]);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  return Math.trunc(minutes);
}

function toLocalDateTime(date: string, time: string): string {
  return `${date}T${time.padStart(5, '0')}`;
}

function minutesBetweenLocalTimes(date: string, from: string, to: string): number | null {
  const start = new Date(toLocalDateTime(date, from)).getTime();
  const end = new Date(toLocalDateTime(date, to)).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

export function applyActivityJournalTextCommand(form: ActivityJournalFormState, value: string): ActivityJournalCommandApplyResult {
  const duration = value.match(/^\s*\/zeit\s+(\d{1,3}\s*(?:m|min|minute|minuten)?)\s+(.+)$/i);
  if (duration) {
    const minutes = minutesFromDurationToken(duration[1]);
    if (minutes === null) return { form, changed: false };
    return {
      changed: true,
      form: {
        ...form,
        timeMode: 'duration',
        durationMinutes: String(minutes),
        title: form.title.trim() || duration[2].trim(),
        description: form.description === value ? duration[2].trim() : form.description,
      },
    };
  }

  const range = value.match(/^\s*\/t\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(.+)$/i);
  if (range) {
    const minutes = minutesBetweenLocalTimes(form.entryDate, range[1], range[2]);
    if (minutes === null) return { form, changed: false };
    return {
      changed: true,
      form: {
        ...form,
        timeMode: 'range',
        durationMinutes: String(minutes),
        startedAt: toLocalDateTime(form.entryDate, range[1]),
        endedAt: toLocalDateTime(form.entryDate, range[2]),
        title: form.title.trim() || range[3].trim(),
        description: form.description === value ? range[3].trim() : form.description,
      },
    };
  }

  const followUp = value.match(/^\s*\/\/\s+(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (followUp) {
    return {
      changed: true,
      form: {
        ...form,
        status: 'follow_up_open',
        followUpDueAt: followUp[1],
        title: form.title.trim() || followUp[2].trim(),
        resultNote: form.resultNote.trim() || followUp[2].trim(),
        description: form.description === value ? followUp[2].trim() : form.description,
      },
    };
  }

  return { form, changed: false };
}
