import { useEffect, useState } from 'react';
import type { GremiaBrExternalReferenceRecord } from '../../../domain/models/gremia-br.model';
import { createProcedureTask } from './gremiaBrWorkspaceActions';
import type { BusyAction } from './GremiaBrWorkspacePanels';

type RunAction = (action: Exclude<BusyAction, null>, work: () => Promise<string>) => Promise<void>;

export function useGremiaBrProcedureTaskCreation(
  caseId: string,
  procedureId: string,
  links: GremiaBrExternalReferenceRecord[],
  runAction: RunAction,
) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');
  }, [caseId, procedureId]);

  return {
    taskTitle, taskDescription, taskDueDate,
    setTaskTitle, setTaskDescription, setTaskDueDate,
    createSelectedProcedureTask: () => runAction('procedure', async () => {
      if (!caseId || !procedureId || !links.some((link) => link.sourceType === 'verfahren' && link.sourceId === procedureId)) {
        throw new Error('Bitte ein verknüpftes Verfahren auswählen.');
      }
      const created = await createProcedureTask({
        caseId, procedureId, title: taskTitle,
        ...(taskDescription.trim() ? { description: taskDescription } : {}),
        ...(taskDueDate ? { dueAt: new Date(`${taskDueDate}T23:59:59`).toISOString() } : {}),
      });
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate('');
      return `Eigene Aufgabe wurde in Gremia.BR angelegt: ${created.title}. Der allgemeine Arbeitsstand bleibt bis zum nächsten bewussten Abruf unverändert.`;
    }),
  };
}
