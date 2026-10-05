import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { Dispatch, SetStateAction } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { defaultCaseProcessDraft } from './casesViewProcessUtils';
import type { CaseProcessDraft, CaseProcessType } from './casesViewProcessUtils';
import { createCaseProcess } from './caseProcessCreation';

type CaseProcessCreationDependencies = {
  selectedCase?: CaseRecord;
  selectedCaseId: string;
  caseProcessDraft: CaseProcessDraft | null;
  setCaseProcessDraft: Dispatch<SetStateAction<CaseProcessDraft | null>>;
  setSelection: (selection: CaseExplorerSelection) => void;
  setNoteError: Dispatch<SetStateAction<string>>;
  setNoteInfo: Dispatch<SetStateAction<string>>;
  reloadSelectedCaseChildren: () => Promise<void>;
  onCasesChanged: () => Promise<void>;
};

export function createCaseProcessActions(deps: CaseProcessCreationDependencies) {
  const { selectedCase, selectedCaseId, caseProcessDraft, setCaseProcessDraft, setSelection, setNoteError, setNoteInfo, reloadSelectedCaseChildren, onCasesChanged } = deps;

  function openCaseProcessDraft(processType: CaseProcessType) {
    if (!selectedCaseId) {
      setNoteError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    setCaseProcessDraft(defaultCaseProcessDraft(processType));
  }

  async function createCaseProcessFromDraft() {
    if (!selectedCase || !caseProcessDraft) return;
    setNoteError('');
    setNoteInfo('');
    try {
      const created = await createCaseProcess(await waitForBridge(), selectedCase, caseProcessDraft);
      setCaseProcessDraft(null);
      setSelection({ type: 'process', processType: caseProcessDraft.processType, id: created.id });
      setNoteInfo(created.message);
      await reloadSelectedCaseChildren();
      await onCasesChanged();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Maßnahme konnte nicht angelegt werden.');
    }
  }

  return { openCaseProcessDraft, createCaseProcessFromDraft };
}
