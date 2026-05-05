import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseDocumentRecord } from '../../core/models/case-document.model';
import type { CaseNoteRecord } from '../../core/models/case-note.model';
import type { CaseLegalReferenceRecord } from '../../core/models/knowledge.model';
import type { PreventionProcessRecord } from '../../core/models/prevention.model';
import type { BemProcessRecord } from '../../core/models/bem.model';
import type { EqualizationProcessRecord } from '../../core/models/equalization.model';
import type { TerminationHearingRecord } from '../../core/models/termination.model';
import type { ParticipationRecord } from '../../core/models/participation.model';
import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';
import { waitForBridge } from '../../core/bridge/waitForBridge';

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
  const [notes, setNotes] = useState<CaseNoteRecord[]>([]);
  const [documents, setDocuments] = useState<CaseDocumentRecord[]>([]);
  const [caseLegalReferences, setCaseLegalReferences] = useState<CaseLegalReferenceRecord[]>([]);
  const [casePreventionProcesses, setCasePreventionProcesses] = useState<PreventionProcessRecord[]>([]);
  const [caseBemProcesses, setCaseBemProcesses] = useState<BemProcessRecord[]>([]);
  const [caseEqualizationProcesses, setCaseEqualizationProcesses] = useState<EqualizationProcessRecord[]>([]);
  const [caseTerminationProcesses, setCaseTerminationProcesses] = useState<TerminationHearingRecord[]>([]);
  const [caseParticipationProcesses, setCaseParticipationProcesses] = useState<ParticipationRecord[]>([]);
  const [selection, setSelection] = useState<CaseExplorerSelection>({ type: 'overview' });
  const [pendingCaseNodeTarget, setPendingCaseNodeTarget] = useState<CaseNodeTarget | null>(null);

  useEffect(() => {
    if (!target) return;
    setPendingCaseNodeTarget(target);
    setSelectedCaseId(target.caseId);
  }, [target]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId), [cases, selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseId && cases.length) setSelectedCaseId(cases[0].id);
  }, [cases, selectedCaseId]);

  function clearChildren() {
    setNotes([]);
    setDocuments([]);
    setCaseLegalReferences([]);
    setCasePreventionProcesses([]);
    setCaseBemProcesses([]);
    setCaseEqualizationProcesses([]);
    setCaseTerminationProcesses([]);
    setCaseParticipationProcesses([]);
  }

  async function loadChildren(caseId: string) {
    const bridge = await waitForBridge();
    if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
    return Promise.all([
      bridge.cases.listNotes(caseId),
      bridge.cases.listDocuments(caseId),
      bridge.knowledge?.listCaseReferences(caseId) ?? Promise.resolve([]),
      bridge.prevention?.list(caseId) ?? Promise.resolve([]),
      bridge.bem?.list(caseId) ?? Promise.resolve([]),
      bridge.equalization?.list(caseId) ?? Promise.resolve([]),
      bridge.termination?.list(caseId) ?? Promise.resolve([]),
      bridge.participation?.list(caseId) ?? Promise.resolve([])
    ]);
  }

  function applySelectionTarget(targetToApply: CaseNodeTarget | null, caseId: string) {
    if (targetToApply?.caseId !== caseId) {
      setSelection({ type: 'overview' });
      return;
    }
    if (targetToApply.nodeType === 'prevention') setSelection({ type: 'process', processType: 'prevention', id: targetToApply.nodeId });
    else if (targetToApply.nodeType === 'bem') setSelection({ type: 'process', processType: 'bem', id: targetToApply.nodeId });
    else if (targetToApply.nodeType === 'equalization') setSelection({ type: 'process', processType: 'equalization', id: targetToApply.nodeId });
    else if (targetToApply.nodeType === 'termination_hearing') setSelection({ type: 'process', processType: 'termination_hearing', id: targetToApply.nodeId });
    else if (targetToApply.nodeType === 'participation') setSelection({ type: 'process', processType: 'participation', id: targetToApply.nodeId });
    else if (targetToApply.nodeType === 'note' && targetToApply.nodeId) setSelection({ type: 'note', id: targetToApply.nodeId });
    else if (targetToApply.nodeType === 'document' && targetToApply.nodeId) setSelection({ type: 'document', id: targetToApply.nodeId });
    else setSelection({ type: 'overview' });
    setPendingCaseNodeTarget(null);
    onTargetConsumed?.();
  }

  useEffect(() => {
    if (!selectedCaseId) {
      clearChildren();
      return;
    }

    let active = true;
    async function loadCaseChildren() {
      try {
        const [noteRows, docRows, legalRefRows, preventionRows, bemRows, equalizationRows, terminationRows, participationRows] = await loadChildren(selectedCaseId);
        if (!active) return;
        setNotes(noteRows);
        setDocuments(docRows);
        setCaseLegalReferences(legalRefRows);
        setCasePreventionProcesses(preventionRows);
        setCaseBemProcesses(bemRows);
        setCaseEqualizationProcesses(equalizationRows);
        setCaseTerminationProcesses(terminationRows);
        setCaseParticipationProcesses(participationRows);
        applySelectionTarget(pendingCaseNodeTarget, selectedCaseId);
      } catch (error) {
        if (active) onError?.(error instanceof Error ? error.message : 'Fallakte konnte nicht geladen werden.');
      }
    }

    void loadCaseChildren();
    return () => { active = false; };
    // selectedCaseId intentionally remains the only reload trigger. Consuming pending target must not reset selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  async function reloadSelectedCaseChildren() {
    if (!selectedCaseId) return;
    const [noteRows, docRows, legalRefRows, preventionRows, bemRows, equalizationRows, terminationRows, participationRows] = await loadChildren(selectedCaseId);
    setNotes(noteRows);
    setDocuments(docRows);
    setCaseLegalReferences(legalRefRows);
    setCasePreventionProcesses(preventionRows);
    setCaseBemProcesses(bemRows);
    setCaseEqualizationProcesses(equalizationRows);
    setCaseTerminationProcesses(terminationRows);
    setCaseParticipationProcesses(participationRows);
  }

  return {
    selectedCaseId,
    setSelectedCaseId,
    selectedCase,
    notes,
    setNotes,
    documents,
    setDocuments,
    caseLegalReferences,
    setCaseLegalReferences,
    casePreventionProcesses,
    caseBemProcesses,
    caseEqualizationProcesses,
    caseTerminationProcesses,
    caseParticipationProcesses,
    setCasePreventionProcesses,
    selection,
    setSelection,
    reloadSelectedCaseChildren
  };
}
