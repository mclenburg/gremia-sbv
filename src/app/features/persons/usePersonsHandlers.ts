import { useCallback, useMemo } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type {
  CreateProtectedPersonInput,
  PersonImportExecuteInput,
  PersonImportPreviewInput,
  UpdateProtectedPersonInput
} from '../../core/models/protected-person.model';
import type { PrivacyReviewActionInput } from '../../core/models/privacy-review.model';

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
    const result = await bridge.persons.evaluateExpiry();
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const listOpenPrivacyReviewsForPerson = useCallback(async (protectedPersonId: string) => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview) throw new Error('Datenschutzprüfung ist nicht erreichbar.');
    return await bridge.privacyReview.listOpenForPerson(protectedPersonId);
  }, []);

  const documentPrivacyRetention = useCallback(async (input: PrivacyReviewActionInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview) throw new Error('Datenschutzprüfung ist nicht erreichbar.');
    const result = await bridge.privacyReview.documentRetention(input);
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const schedulePrivacyReviewLater = useCallback(async (input: PrivacyReviewActionInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview) throw new Error('Datenschutzprüfung ist nicht erreichbar.');
    const result = await bridge.privacyReview.scheduleLater(input);
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const clearPrivacyReview = useCallback(async (input: PrivacyReviewActionInput) => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview) throw new Error('Datenschutzprüfung ist nicht erreichbar.');
    const result = await bridge.privacyReview.clearCase(input);
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const anonymizePrivacyReviewCase = useCallback(async (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>) => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview?.anonymizeCase) throw new Error('Anonymisierung ist nicht erreichbar.');
    const result = await bridge.privacyReview.anonymizeCase(input);
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const deletePrivacyReviewCase = useCallback(async (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>) => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview?.deleteCase) throw new Error('Löschung ist nicht erreichbar.');
    const result = await bridge.privacyReview.deleteCase(input);
    await reloadWorkData();
    return result;
  }, [reloadWorkData]);

  const anonymizeProtectedPerson = useCallback(async (personId: string, reason: string) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons?.anonymize) throw new Error('Personenanonymisierung ist nicht erreichbar.');
    await bridge.persons.anonymize(personId, reason);
    await reloadWorkData();
  }, [reloadWorkData]);

  const deleteProtectedPerson = useCallback(async (personId: string, reason: string) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons?.delete) throw new Error('Personenlöschung ist nicht erreichbar.');
    await bridge.persons.delete(personId, reason);
    await reloadWorkData();
  }, [reloadWorkData]);

  const exportDeadlinesAsIcal = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.deadlines?.exportIcal) throw new Error('iCal-Export ist nicht erreichbar.');
    const ics = await bridge.deadlines.exportIcal({ status: ['open', 'overdue'] }, 'process_type');
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
    listOpenPrivacyReviewsForPerson,
    documentPrivacyRetention,
    schedulePrivacyReviewLater,
    clearPrivacyReview,
    anonymizePrivacyReviewCase,
    deletePrivacyReviewCase,
    anonymizeProtectedPerson,
    deleteProtectedPerson,
    exportDeadlinesAsIcal
  }), [
    createProtectedPerson,
    updateProtectedPerson,
    selectProtectedPersonImportFile,
    previewProtectedPersonsImport,
    executeProtectedPersonsImport,
    evaluateProtectedPersonExpiry,
    listOpenPrivacyReviewsForPerson,
    documentPrivacyRetention,
    schedulePrivacyReviewLater,
    clearPrivacyReview,
    anonymizePrivacyReviewCase,
    deletePrivacyReviewCase,
    anonymizeProtectedPerson,
    deleteProtectedPerson,
    exportDeadlinesAsIcal
  ]);
}
