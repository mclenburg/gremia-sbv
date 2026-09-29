import { useEffect, useRef, useState } from 'react';
import type { GremiaBrOwnTaskDetail } from '../../../domain/models/gremia-br.model';
import { loadOwnTaskDetail } from './gremiaBrWorkspaceActions';

export function useGremiaBrTaskDetail(announce: (message: string, politeness?: 'polite' | 'assertive') => void) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<GremiaBrOwnTaskDetail | null>(null);
  const [taskDetailError, setTaskDetailError] = useState('');
  const [taskDetailBusy, setTaskDetailBusy] = useState(false);
  const requestCounter = useRef(0);

  useEffect(() => () => { requestCounter.current += 1; }, []);

  function closeTaskDetail() {
    requestCounter.current += 1;
    setSelectedTaskId(null);
    setTaskDetail(null);
    setTaskDetailError('');
    setTaskDetailBusy(false);
  }

  async function openTaskDetail(id: string) {
    const request = ++requestCounter.current;
    setSelectedTaskId(id);
    setTaskDetail(null);
    setTaskDetailError('');
    setTaskDetailBusy(true);
    try {
      const detail = await loadOwnTaskDetail(id);
      if (request === requestCounter.current) setTaskDetail(detail);
    } catch (err) {
      if (request !== requestCounter.current) return;
      const message = err instanceof Error ? err.message : 'Aufgabendetails konnten nicht geladen werden. Bitte erneut versuchen.';
      setTaskDetailError(message);
      announce(message, 'assertive');
    } finally {
      if (request === requestCounter.current) setTaskDetailBusy(false);
    }
  }

  return { selectedTaskId, taskDetail, taskDetailError, taskDetailBusy, openTaskDetail, closeTaskDetail };
}
