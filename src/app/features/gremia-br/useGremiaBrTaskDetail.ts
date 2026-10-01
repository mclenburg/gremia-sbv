import { useEffect, useRef, useState } from 'react';
import type { GremiaBrOwnTaskDetail, GremiaBrTaskTransitionOptions } from '../../../domain/models/gremia-br.model';
import { loadOwnTaskDetail, loadOwnTaskTransitions, transitionOwnTask } from './gremiaBrWorkspaceActions';

export function useGremiaBrTaskDetail(announce: (message: string, politeness?: 'polite' | 'assertive') => void) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<GremiaBrOwnTaskDetail | null>(null);
  const [taskDetailError, setTaskDetailError] = useState('');
  const [taskDetailBusy, setTaskDetailBusy] = useState(false);
  const [transitionOptions, setTransitionOptions] = useState<GremiaBrTaskTransitionOptions | null>(null);
  const [selectedTransition, setSelectedTransition] = useState('');
  const [optionsBusy, setOptionsBusy] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [taskDetailStatus, setTaskDetailStatus] = useState('');
  const requestCounter = useRef(0);

  useEffect(() => () => { requestCounter.current += 1; }, []);

  function closeTaskDetail() {
    requestCounter.current += 1;
    setSelectedTaskId(null);
    setTaskDetail(null);
    setTaskDetailError('');
    setTaskDetailBusy(false);
    setTransitionOptions(null);
    setSelectedTransition('');
    setOptionsBusy(false);
    setTransitionBusy(false);
    setTaskDetailStatus('');
  }

  async function openTaskDetail(id: string) {
    const request = ++requestCounter.current;
    setSelectedTaskId(id);
    setTaskDetail(null);
    setTaskDetailError('');
    setTaskDetailBusy(true);
    setTransitionOptions(null);
    setSelectedTransition('');
    setTaskDetailStatus('');
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

  async function loadTransitions() {
    if (!selectedTaskId || !taskDetail) return;
    const request = ++requestCounter.current;
    setTaskDetailError('');
    setTransitionOptions(null);
    setSelectedTransition('');
    setOptionsBusy(true);
    try {
      const options = await loadOwnTaskTransitions(selectedTaskId);
      if (request !== requestCounter.current) return;
      if (options.from !== taskDetail.status) {
        throw new Error('Der Aufgabenstatus hat sich geändert. Bitte Gremia.BR aktualisieren und die Aufgabe erneut prüfen.');
      }
      setTransitionOptions(options);
    } catch (err) {
      if (request !== requestCounter.current) return;
      const message = err instanceof Error ? err.message : 'Statusmöglichkeiten konnten nicht geladen werden. Bitte erneut versuchen.';
      setTaskDetailError(message);
      announce(message, 'assertive');
    } finally {
      if (request === requestCounter.current) setOptionsBusy(false);
    }
  }

  async function submitTransition() {
    const to = transitionOptions?.allowed.find((status) => status === selectedTransition);
    if (!selectedTaskId || !taskDetail || !to || transitionOptions?.from !== taskDetail.status) return;
    const request = ++requestCounter.current;
    setTaskDetailError('');
    setTaskDetailStatus('');
    setTransitionBusy(true);
    try {
      const updated = await transitionOwnTask({ taskId: selectedTaskId, to, expectedVersion: taskDetail.version });
      if (request !== requestCounter.current) return;
      setTaskDetail(updated);
      setTransitionOptions(null);
      setSelectedTransition('');
      setTaskDetailStatus('Der Aufgabenstatus wurde in Gremia.BR geändert.');
      announce('Der Aufgabenstatus wurde in Gremia.BR geändert.', 'polite');
    } catch (err) {
      if (request !== requestCounter.current) return;
      const message = err instanceof Error ? err.message : 'Der Aufgabenstatus konnte nicht geändert werden. Bitte Gremia.BR aktualisieren und die Aufgabe erneut prüfen.';
      setTransitionOptions(null);
      setSelectedTransition('');
      setTaskDetailError(message);
      announce(message, 'assertive');
    } finally {
      if (request === requestCounter.current) setTransitionBusy(false);
    }
  }

  return {
    selectedTaskId, taskDetail, taskDetailError, taskDetailBusy, taskDetailStatus,
    transitionOptions, selectedTransition, optionsBusy, transitionBusy,
    openTaskDetail, closeTaskDetail, loadTransitions, setSelectedTransition, submitTransition,
  };
}
