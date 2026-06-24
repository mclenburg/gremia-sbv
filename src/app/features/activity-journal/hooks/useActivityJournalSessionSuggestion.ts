import { useEffect, useMemo, useState } from 'react';
import type { ActivityJournalPrefillContext } from '../../../core/models/activity-journal.model';
import { waitForBridge } from '../../../core/bridge/waitForBridge';

export type ActivityJournalSessionSuggestionState = {
  visible: boolean;
  elapsedMinutes: number;
  label: string;
};

const DEFAULT_MINIMUM_MINUTES = 10;

export function minutesSince(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now) || now < startedAt) return 0;
  return Math.floor((now - startedAt) / 60000);
}

export function shouldOfferActivitySuggestion(input: {
  hasPersistentJournalHistory: boolean;
  openedAt: number;
  now: number;
  minimumMinutes?: number;
}): boolean {
  return input.hasPersistentJournalHistory && minutesSince(input.openedAt, input.now) >= (input.minimumMinutes ?? DEFAULT_MINIMUM_MINUTES);
}

export function buildActivitySuggestionLabel(context: ActivityJournalPrefillContext, elapsedMinutes: number): string {
  const target = context.caseNumber?.trim() || context.title?.trim() || context.contextType;
  return `Tätigkeit erfassen? ${elapsedMinutes} Minuten in ${target}.`;
}

export function useActivityJournalSessionSuggestion(context: ActivityJournalPrefillContext, options: { minimumMinutes?: number } = {}) {
  const openedAt = useMemo(() => Date.now(), [context.contextType, context.contextId, context.caseId, context.caseNumber, context.title]);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(false);
  const [hasPersistentJournalHistory, setHasPersistentJournalHistory] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDismissed(false);
    setHasPersistentJournalHistory(false);
    let active = true;
    async function loadHistoryFlag() {
      const bridge = await waitForBridge();
      if (!active || !bridge?.activityJournal) return;
      const summary = await bridge.activityJournal.summary();
      if (active) setHasPersistentJournalHistory(summary.totalEntries > 0);
    }
    loadHistoryFlag().catch(() => {
      if (active) setHasPersistentJournalHistory(false);
    });
    return () => { active = false; };
  }, [context.contextType, context.contextId, context.caseId, context.caseNumber, context.title]);

  const elapsedMinutes = minutesSince(openedAt, now);
  const visible = !dismissed && shouldOfferActivitySuggestion({
    hasPersistentJournalHistory,
    openedAt,
    now,
    minimumMinutes: options.minimumMinutes,
  });

  return {
    visible,
    elapsedMinutes,
    label: buildActivitySuggestionLabel(context, elapsedMinutes),
    dismiss: () => setDismissed(true),
  } satisfies ActivityJournalSessionSuggestionState & { dismiss: () => void };
}
