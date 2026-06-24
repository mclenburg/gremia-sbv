import { useCallback, useEffect, useMemo, useState } from 'react';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type {
  ActivityJournalCategory,
  ActivityJournalContextType,
  ActivityJournalEntryRecord,
  ActivityJournalListFilter,
  ActivityJournalPrefill,
  ActivityJournalSummary,
  CreateActivityJournalEntryInput,
} from '../../../core/models/activity-journal.model';
import { applyActivityJournalTextCommand } from '../activityJournalTextCommands';
import { applyTimeSuggestion, buildTimeSuggestionFromStartTime, type ActivityJournalTimeSuggestion } from '../activityJournalTimeSuggestion';

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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyActivityJournalForm(): ActivityJournalFormState {
  return {
    title: '',
    description: '',
    resultNote: '',
    entryDate: today(),
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
    entryDate: entry.entryDate ?? today(),
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
    setMessage(`${pendingPrefill.sourceLabel}: Vorlage übernommen. Gespeichert wird erst nach bewusster Bestätigung.`);
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

  async function saveEntry() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
      await bridge.activityJournal.create(buildActivityJournalInput(form));
      await bridge.activityJournal.rememberCategory(form.preferenceContextType, form.category);
      setForm(createEmptyActivityJournalForm());
      setTimeSuggestion(null);
      setMessage('Tätigkeit wurde bewusst als SBV-Eigenaufzeichnung gespeichert.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
      await bridge.activityJournal.delete(id);
      setMessage('Journaleintrag wurde gelöscht. Verknüpfte Journal-Wiedervorlagen wurden entfernt.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function previewExport() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
      const result = await bridge.activityJournal.export(filter, 'summary', { markAsExported: false });
      setMessage(`${result.heading}: ${result.totalEntries} Einträge, ${Math.floor(result.totalMinutes / 60)} h ${String(result.totalMinutes % 60).padStart(2, '0')} min. Vorschau ohne Exportmarkierung erstellt.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function markExported() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
      const result = await bridge.activityJournal.export(filter, 'summary', { markAsExported: true });
      setMessage(`${result.heading}: ${result.totalEntries} Einträge wurden bewusst als letzter bekannter Nachweisexport markiert.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

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
    saveEntry,
    deleteEntry,
    previewExport,
    markExported,
    updateDescription,
    updateResultNote,
    acceptTimeSuggestion,
    dismissTimeSuggestion,
  };
}
