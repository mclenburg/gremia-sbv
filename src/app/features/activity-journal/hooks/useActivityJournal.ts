import { useCallback, useEffect, useMemo, useState } from 'react';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type {
  ActivityJournalCategory,
  ActivityJournalEntryRecord,
  ActivityJournalListFilter,
  ActivityJournalPrefill,
  ActivityJournalSummary,
} from '../../../../domain/models/activity-journal.model';
import { applyActivityJournalTextCommand } from '../activityJournalTextCommands';
import { applyTimeSuggestion, buildTimeSuggestionFromStartTime, type ActivityJournalTimeSuggestion } from '../activityJournalTimeSuggestion';
import { createEmptyActivityJournalForm, formFromActivityJournalPrefill, type ActivityJournalFormState } from '../activityJournalForm';
import { createActivityJournalActions } from '../activityJournalActions';

export function useActivityJournal(pendingPrefill?: ActivityJournalPrefill | null, onPrefillConsumed?: () => void) {
  const [entries, setEntries] = useState<ActivityJournalEntryRecord[]>([]);
  const [summary, setSummary] = useState<ActivityJournalSummary | null>(null);
  const [form, setForm] = useState<ActivityJournalFormState>(() => createEmptyActivityJournalForm());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActivityJournalCategory | ''>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [timeSuggestion, setTimeSuggestion] = useState<ActivityJournalTimeSuggestion | null>(null);

  const filter = useMemo<ActivityJournalListFilter>(() => ({
    search: search.trim() || undefined,
    categories: categoryFilter ? [categoryFilter] : undefined,
    limit: 100,
  }), [categoryFilter, search]);

  const reload = useCallback(async () => {
    setError('');
    const bridge = await waitForBridge();
    if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
    const [nextEntries, nextSummary] = await Promise.all([
      bridge.activityJournal.list(filter),
      bridge.activityJournal.summary(),
    ]);
    setEntries(nextEntries);
    setSummary(nextSummary);
  }, [filter]);

  useEffect(() => {
    let active = true;
    reload().catch((err) => {
      if (active) setError(err instanceof Error ? err.message : String(err));
    });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (!pendingPrefill) return;
    setForm(formFromActivityJournalPrefill(pendingPrefill));
    setMessage('Vorbelegung übernommen.');
    onPrefillConsumed?.();
  }, [onPrefillConsumed, pendingPrefill]);

  function updateDescription(value: string) {
    setForm((current) => {
      const next = { ...current, description: value };
      const applied = applyActivityJournalTextCommand(next, value);
      const suggestion = applied.changed ? null : buildTimeSuggestionFromStartTime({ entryDate: applied.form.entryDate, value });
      setTimeSuggestion(suggestion);
      return applied.form;
    });
  }

  function updateResultNote(value: string) {
    setForm((current) => {
      const next = { ...current, resultNote: value };
      const applied = applyActivityJournalTextCommand(next, value);
      const suggestion = applied.changed ? null : buildTimeSuggestionFromStartTime({ entryDate: applied.form.entryDate, value });
      setTimeSuggestion(suggestion);
      return applied.changed ? { ...applied.form, resultNote: applied.form.resultNote || value } : next;
    });
  }

  function acceptTimeSuggestion() {
    if (!timeSuggestion) return;
    setForm((current) => applyTimeSuggestion(current, timeSuggestion));
    setTimeSuggestion(null);
  }

  function dismissTimeSuggestion() {
    setTimeSuggestion(null);
  }

  const actions = createActivityJournalActions({ form, filter, reload, setForm, setTimeSuggestion, setBusy, setError, setMessage });

  return {
    entries,
    summary,
    form,
    setForm,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    message,
    error,
    busy,
    timeSuggestion,
    reload,
    ...actions,
    updateDescription,
    updateResultNote,
    acceptTimeSuggestion,
    dismissTimeSuggestion,
  };
}
