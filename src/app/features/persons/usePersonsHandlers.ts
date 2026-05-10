import { useCallback, useMemo } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type {
  CreateProtectedPersonInput,
  PersonImportExecuteInput,
  PersonImportPreviewInput,
  UpdateProtectedPersonInput
} from '../../core/models/protected-person.model';

export function usePersonsHandlers(reloadWorkData: () => Promise<void>) {
  const createProtectedPerson = useCallback(async (input: CreateProtectedPersonInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Personendienst ist nicht erreichbar.');
    await bridge.persons.create(input);
    await reloadWorkData();
  }, [reloadWorkData]);

  const updateProtectedPerson = useCallback(async (id: string, input: UpdateProtectedPersonInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Personendienst ist nicht erreichbar.');
    await bridge.persons.update(id, input);
    await reloadWorkData();
  }, [reloadWorkData]);

  const selectProtectedPersonImportFile = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Personenimport ist nicht erreichbar.');
    return await bridge.persons.selectImportFile();
  }, []);

  const previewProtectedPersonsImport = useCallback(async (input: PersonImportPreviewInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Personenimport ist nicht erreichbar.');
    return await bridge.persons.previewImport(input);
  }, []);

  const executeProtectedPersonsImport = useCallback(async (input: PersonImportExecuteInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Personenimport ist nicht erreichbar.');
    const result = await bridge.persons.executeImport(input);
    await bridge.persons.evaluateExpiry();
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const evaluateProtectedPersonExpiry = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Statusprüfung ist nicht erreichbar.');
    await bridge.persons.evaluateExpiry();
    await reloadWorkData();
  }, [reloadWorkData]);

  const exportDeadlinesAsIcal = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines?.exportIcal) throw new Error('iCal-Export ist nicht erreichbar.');
    const ics = await bridge.deadlines.exportIcal({ status: ['open', 'overdue'] }, 'privacy_first');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gremia-sbv-fristen.ics';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return useMemo(() => ({
    createProtectedPerson,
    updateProtectedPerson,
    selectProtectedPersonImportFile,
    previewProtectedPersonsImport,
    executeProtectedPersonsImport,
    evaluateProtectedPersonExpiry,
    exportDeadlinesAsIcal
  }), [
    createProtectedPerson,
    updateProtectedPerson,
    selectProtectedPersonImportFile,
    previewProtectedPersonsImport,
    executeProtectedPersonsImport,
    evaluateProtectedPersonExpiry,
    exportDeadlinesAsIcal
  ]);
}
