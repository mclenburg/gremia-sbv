import { useCallback, useEffect, useMemo, useReducer, useState, type Dispatch, type SetStateAction } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { caseChildrenReducer, emptyCaseChildren, loadCaseChildren, type CaseChildren } from './caseChildrenData';
import { selectionForCaseNodeTarget, shouldAutoSelectFirstCase } from './caseNodeTargetSelection';

function selectCaseNode(
  target: CaseNodeTarget,
  selectedCaseId: string,
  setSelection: Dispatch<SetStateAction<CaseExplorerSelection>>,
  setPendingTarget: Dispatch<SetStateAction<CaseNodeTarget | null>>,
  setSelectedCaseId: Dispatch<SetStateAction<string>>,
): void {
  if (target.caseId === selectedCaseId) {
    setSelection(selectionForCaseNodeTarget(target, selectedCaseId) ?? { type: 'overview' });
    return;
  }
  setPendingTarget(target);
  setSelectedCaseId(target.caseId);
}

export function useCaseWorkbenchData({
  cases,
  target,
  onTargetConsumed,
  onError
}: {
  cases: CaseRecord[];
  target?: CaseNodeTarget | null;
  onTargetConsumed?: () => void;
  onError?: (message: string) => void;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [children, dispatchChildren] = useReducer(caseChildrenReducer, undefined, emptyCaseChildren);
  const [selection, setSelection] = useState<CaseExplorerSelection>({ type: 'overview' });
  const [pendingCaseNodeTarget, setPendingCaseNodeTarget] = useState<CaseNodeTarget | null>(null);
  const [isCaseChildrenLoading, setIsCaseChildrenLoading] = useState(false);

  const selectCaseNodeTarget = (nextTarget: CaseNodeTarget): void =>
    selectCaseNode(nextTarget, selectedCaseId, setSelection, setPendingCaseNodeTarget, setSelectedCaseId);

  useEffect(() => {
    if (!target) return;
    setPendingCaseNodeTarget(target);
    setSelectedCaseId(target.caseId);
  }, [target]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId), [cases, selectedCaseId]);

  useEffect(() => {
    if (shouldAutoSelectFirstCase({
      selectedCaseId,
      hasCases: cases.length > 0,
      hasTarget: Boolean(target),
      hasPendingTarget: Boolean(pendingCaseNodeTarget)
    })) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId, target, pendingCaseNodeTarget]);

  const clearChildren = useCallback(() => {
    dispatchChildren({ type: 'clear' });
  }, []);

  const setCaseLegalReferences = useCallback((update: SetStateAction<CaseChildren['caseLegalReferences']>) => {
    dispatchChildren({ type: 'legalReferences', update });
  }, []);

  function applySelectionTarget(targetToApply: CaseNodeTarget | null, caseId: string) {
    const nextSelection = selectionForCaseNodeTarget(targetToApply, caseId);
    if (!nextSelection) return;
    setSelection(nextSelection);
    setPendingCaseNodeTarget(null);
    onTargetConsumed?.();
  }

  useEffect(() => {
    if (!pendingCaseNodeTarget || pendingCaseNodeTarget.caseId !== selectedCaseId) return;
    applySelectionTarget(pendingCaseNodeTarget, selectedCaseId);
    // Pending targets are consumed intentionally without waiting for a child reload when
    // the requested case is already selected. The detail arrays update independently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCaseNodeTarget, selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseId) {
      clearChildren();
      setIsCaseChildrenLoading(false);
      return;
    }

    let active = true;
    clearChildren();
    setIsCaseChildrenLoading(true);
    if (!pendingCaseNodeTarget || pendingCaseNodeTarget.caseId !== selectedCaseId) {
      setSelection({ type: 'overview' });
    }

    async function loadSelectedCaseChildren() {
      try {
        const rows = await loadCaseChildren(selectedCaseId);
        if (!active) return;
        dispatchChildren({ type: 'loaded', children: rows });
        applySelectionTarget(pendingCaseNodeTarget, selectedCaseId);
      } catch (error) {
        if (active) onError?.(error instanceof Error ? error.message : 'Fallakte konnte nicht geladen werden.');
      } finally {
        if (active) setIsCaseChildrenLoading(false);
      }
    }

    void loadSelectedCaseChildren();
    return () => { active = false; };
    // selectedCaseId intentionally remains the only reload trigger. Consuming pending target must not reset selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  async function reloadSelectedCaseChildren() {
    if (!selectedCaseId) return;
    setIsCaseChildrenLoading(true);
    try {
      dispatchChildren({ type: 'loaded', children: await loadCaseChildren(selectedCaseId) });
    } finally {
      setIsCaseChildrenLoading(false);
    }
  }

  return {
    selectedCaseId,
    setSelectedCaseId,
    selectedCase,
    ...children,
    setCaseLegalReferences,
    isCaseChildrenLoading,
    selection,
    setSelection,
    selectCaseNodeTarget,
    reloadSelectedCaseChildren
  };
}
