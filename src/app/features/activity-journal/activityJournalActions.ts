import type { Dispatch, SetStateAction } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { ActivityJournalListFilter } from '../../../domain/models/activity-journal.model';
import { buildActivityJournalInput, createEmptyActivityJournalForm, type ActivityJournalFormState } from './activityJournalForm';
import type { ActivityJournalTimeSuggestion } from './activityJournalTimeSuggestion';

type ActivityJournalActionDeps = {
  form: ActivityJournalFormState;
  filter: ActivityJournalListFilter;
  reload: () => Promise<void>;
  setForm: Dispatch<SetStateAction<ActivityJournalFormState>>;
  setTimeSuggestion: Dispatch<SetStateAction<ActivityJournalTimeSuggestion | null>>;
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  setMessage: (message: string) => void;
};

export function createActivityJournalActions({ form, filter, reload, setForm, setTimeSuggestion, setBusy, setError, setMessage }: ActivityJournalActionDeps) {
  async function runOperation<Result>(
    operation: (service: NonNullable<Window['gremiaSbv']>['activityJournal']) => Promise<Result>,
    failureResult: Result,
  ): Promise<Result> {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.activityJournal) throw new Error('Tätigkeitsjournal-Dienst ist nicht erreichbar.');
      return await operation(bridge.activityJournal);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      return failureResult;
    } finally {
      setBusy(false);
    }
  }

  function saveEntry(): Promise<boolean> {
    return runOperation(async (service) => {
      await service.create(buildActivityJournalInput(form));
      await service.rememberCategory(form.preferenceContextType, form.category);
      setForm(createEmptyActivityJournalForm());
      setTimeSuggestion(null);
      setMessage('Tätigkeit wurde bewusst als SBV-Eigenaufzeichnung gespeichert.');
      await reload();
      return true;
    }, false);
  }

  function deleteEntry(id: string) {
    return runOperation(async (service) => {
      await service.delete(id);
      setMessage('Journaleintrag wurde gelöscht. Verknüpfte Journal-Wiedervorlagen wurden entfernt.');
      await reload();
    }, undefined);
  }

  function previewExport() {
    return runOperation(async (service) => {
      const result = await service.export(filter, 'summary', { markAsExported: false });
      setMessage(`${result.heading}: ${result.totalEntries} Einträge, ${Math.floor(result.totalMinutes / 60)} h ${String(result.totalMinutes % 60).padStart(2, '0')} min. Vorschau ohne Exportmarkierung erstellt.`);
    }, undefined);
  }

  function markExported() {
    return runOperation(async (service) => {
      const result = await service.export(filter, 'summary', { markAsExported: true });
      setMessage(`${result.heading}: ${result.totalEntries} Einträge wurden bewusst als letzter bekannter Nachweisexport markiert.`);
      await reload();
    }, undefined);
  }

  return { saveEntry, deleteEntry, previewExport, markExported };
}
