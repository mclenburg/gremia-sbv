import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConfigureElectionSetupInput,
  CreateElectionInput,
  ElectionPreparationOverview,
  ElectionRecord,
} from '../../../domain/models/election-workflow.model';
import type { ElectionExecutionOverview } from '../../../domain/models/election-execution.model';
import type { ElectionFeedback } from './electionDocumentFeedback';

type ElectionOperationFeedback<T> = string | ((result: T) => ElectionFeedback);

function electionFeedback<T>(feedback: ElectionOperationFeedback<T>, result: T): ElectionFeedback {
  return typeof feedback === 'function' ? feedback(result) : { message: feedback, tone: 'success' };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useElectionWorkbench() {
  const [elections, setElections] = useState<ElectionRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [overview, setOverview] = useState<ElectionPreparationOverview | null>(null);
  const [execution, setExecution] = useState<ElectionExecutionOverview | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedIdRef = useRef('');

  const selectId = useCallback((id: string) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  }, []);

  const loadElectionDetails = useCallback(async (id: string) => {
    const [nextOverview, nextExecution] = await Promise.all([
      window.gremiaSbv.elections.overview(id),
      window.gremiaSbv.elections.executionOverview(id),
    ]);
    setOverview(nextOverview);
    setExecution(nextExecution);
  }, []);

  const clearElectionDetails = useCallback(() => {
    setOverview(null);
    setExecution(null);
  }, []);

  const refresh = useCallback(async (preferId?: string) => {
    const list = await window.gremiaSbv.elections.list();
    setElections(list);

    const nextSelectedId = preferId || selectedIdRef.current || list[0]?.id || '';
    selectId(nextSelectedId);
    if (nextSelectedId) await loadElectionDetails(nextSelectedId);
    else clearElectionDetails();
  }, [clearElectionDetails, loadElectionDetails, selectId]);

  useEffect(() => {
    void refresh().catch((loadError) => setError(errorMessage(loadError, 'Wahlbereich konnte nicht geladen werden.')));
  }, [refresh]);

  async function select(id: string) {
    selectId(id);
    if (id) await loadElectionDetails(id);
    else clearElectionDetails();
  }

  async function create(input: CreateElectionInput) {
    setError('');
    setNotice('');
    try {
      const election = await window.gremiaSbv.elections.create(input);
      await refresh(election.id);
      setNotice('Wahlvorgang angelegt.');
    } catch (createError) {
      setError(errorMessage(createError, 'Wahlvorgang konnte nicht angelegt werden.'));
    }
  }

  async function run<T>(op: () => Promise<T>, feedback: ElectionOperationFeedback<T>): Promise<T | undefined> {
    setError('');
    setNotice('');
    try {
      const result = await op();
      await refresh(selectedId);
      const resolvedFeedback = electionFeedback(feedback, result);
      if (resolvedFeedback.tone === 'warning') setError(resolvedFeedback.message);
      else setNotice(resolvedFeedback.message);
      return result;
    } catch (operationError) {
      setError(errorMessage(operationError, 'Aktion fehlgeschlagen.'));
      return undefined;
    }
  }

  return {
    elections,
    selectedId,
    overview,
    execution,
    error,
    notice,
    refresh,
    select,
    create,
    configure: (input: ConfigureElectionSetupInput) => run(
      async () => window.gremiaSbv.elections.configureSetup(selectedId, input),
      'Verfahrensprüfung gespeichert.',
    ),
    run,
  };
}
