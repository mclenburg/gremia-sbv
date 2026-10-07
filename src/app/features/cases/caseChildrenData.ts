import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { SetStateAction } from 'react';

export async function loadCaseChildren(caseId: string) {
  const bridge = await waitForBridge();
  if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
  const [notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses,
    caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses,
    caseWorkplaceAccommodationProcesses] = await Promise.all([
    bridge.cases.listNotes(caseId),
    bridge.cases.listDocuments(caseId),
    bridge.knowledge?.listCaseReferences(caseId) ?? Promise.resolve([]),
    bridge.prevention?.list(caseId) ?? Promise.resolve([]),
    bridge.bem?.list(caseId) ?? Promise.resolve([]),
    bridge.equalization?.list(caseId) ?? Promise.resolve([]),
    bridge.termination?.list(caseId) ?? Promise.resolve([]),
    bridge.participation?.list(caseId) ?? Promise.resolve([]),
    bridge.workplaceAccommodation?.list(caseId) ?? Promise.resolve([]),
  ]);
  return { notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses,
    caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses,
    caseWorkplaceAccommodationProcesses };
}

export type CaseChildren = Awaited<ReturnType<typeof loadCaseChildren>>;

export function emptyCaseChildren(): CaseChildren {
  return {
    notes: [], documents: [], caseLegalReferences: [], casePreventionProcesses: [], caseBemProcesses: [],
    caseEqualizationProcesses: [], caseTerminationProcesses: [], caseParticipationProcesses: [],
    caseWorkplaceAccommodationProcesses: [],
  };
}

type CaseChildrenAction =
  | { type: 'loaded'; children: CaseChildren }
  | { type: 'clear' }
  | { type: 'legalReferences'; update: SetStateAction<CaseChildren['caseLegalReferences']> };

export function caseChildrenReducer(state: CaseChildren, action: CaseChildrenAction): CaseChildren {
  switch (action.type) {
    case 'loaded': return action.children;
    case 'clear': return emptyCaseChildren();
    case 'legalReferences': return {
      ...state,
      caseLegalReferences: typeof action.update === 'function' ? action.update(state.caseLegalReferences) : action.update,
    };
  }
}
