import type { ActivityJournalPrefill } from '../../core/models/activity-journal.model';

export const ACTIVITY_JOURNAL_PREFILL_EVENT = 'gremia-sbv:activity-journal-prefill-ready';

export type ActivityJournalPrefillEventDetail = {
  prefill: ActivityJournalPrefill;
  navigate?: boolean;
};

export function dispatchActivityJournalPrefill(prefill: ActivityJournalPrefill, navigate = true): void {
  window.dispatchEvent(new CustomEvent<ActivityJournalPrefillEventDetail>(ACTIVITY_JOURNAL_PREFILL_EVENT, {
    detail: { prefill, navigate },
  }));
}
