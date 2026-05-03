import { useEffect, useMemo, useState } from 'react';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseDocumentRecord } from '../../core/models/case-document.model';
import type { CaseNoteRecord } from '../../core/models/case-note.model';
import type { CaseLegalReferenceRecord } from '../../core/models/knowledge.model';
import type { PreventionProcessRecord } from '../../core/models/prevention.model';
import type { BemProcessRecord } from '../../core/models/bem.model';
import type { EqualizationProcessRecord } from '../../core/models/equalization.model';
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
  const [selection, setSelection] = useState<CaseExplorerSelection>({ type: 'overview' });
  const [pendingCaseNodeTarget, setPendingCaseNodeTarget] = useState<CaseNodeTarget | null>(null);

  useEffect(() => {
    if (!target) return;
    setPendingCaseNodeTarget(target);
    setSelectedCaseId(target.caseId);
  }, [target]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId), [cases, selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseId && cases.length) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseId) {
      setNotes([]);
      setDocuments([]);
      setCaseLegalReferences([]);
      setCasePreventionProcesses([]);
      setCaseBemProcesses([]);
      setCaseEqualizationProcesses([]);
      return;
    }

    let active = true;
    async function loadCaseChildren() {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
        const [noteRows, docRows, legalRefRows, preventionRows, bemRows, equalizationRows] = await Promise.all([
          bridge.cases.listNotes(selectedCaseId),
          bridge.cases.listDocuments(selectedCaseId),
          bridge.knowledge?.listCaseReferences(selectedCaseId) ?? Promise.resolve([]),
          bridge.prevention?.list(selectedCaseId) ?? Promise.resolve([]),
          bridge.bem?.list(selectedCaseId) ?? Promise.resolve([]),
          bridge.equalization?.list(selectedCaseId) ?? Promise.resolve([])
        ]);
        if (active) {
          setNotes(noteRows);
          setDocuments(docRows);
          setCaseLegalReferences(legalRefRows);
          setCasePreventionProcesses(preventionRows);
          setCaseBemProcesses(bemRows);
          setCaseEqualizationProcesses(equalizationRows);
          if (pendingCaseNodeTarget?.caseId === selectedCaseId) {
            if (pendingCaseNodeTarget.nodeType === 'prevention') {
              setSelection({ type: 'process', processType: 'prevention', id: pendingCaseNodeTarget.nodeId });
            } else if (pendingCaseNodeTarget.nodeType === 'bem') {
              setSelection({ type: 'process', processType: 'bem', id: pendingCaseNodeTarget.nodeId });
            } else if (pendingCaseNodeTarget.nodeType === 'equalization') {
              setSelection({ type: 'process', processType: 'equalization', id: pendingCaseNodeTarget.nodeId });
            } else if (pendingCaseNodeTarget.nodeType === 'note' && pendingCaseNodeTarget.nodeId) {
              setSelection({ type: 'note', id: pendingCaseNodeTarget.nodeId });
            } else if (pendingCaseNodeTarget.nodeType === 'document' && pendingCaseNodeTarget.nodeId) {
              setSelection({ type: 'document', id: pendingCaseNodeTarget.nodeId });
            } else {
              setSelection({ type: 'overview' });
            }
            setPendingCaseNodeTarget(null);
            onTargetConsumed?.();
          } else {
            setSelection({ type: 'overview' });
          }
        }
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
    const bridge = await waitForBridge();
    if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
    const [noteRows, docRows, legalRefRows, preventionRows, bemRows, equalizationRows] = await Promise.all([
      bridge.cases.listNotes(selectedCaseId),
      bridge.cases.listDocuments(selectedCaseId),
      bridge.knowledge?.listCaseReferences(selectedCaseId) ?? Promise.resolve([]),
      bridge.prevention?.list(selectedCaseId) ?? Promise.resolve([]),
      bridge.bem?.list(selectedCaseId) ?? Promise.resolve([]),
      bridge.equalization?.list(selectedCaseId) ?? Promise.resolve([])
    ]);
    setNotes(noteRows);
    setDocuments(docRows);
    setCaseLegalReferences(legalRefRows);
    setCasePreventionProcesses(preventionRows);
    setCaseBemProcesses(bemRows);
    setCaseEqualizationProcesses(equalizationRows);
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
    setCasePreventionProcesses,
    selection,
    setSelection,
    reloadSelectedCaseChildren
  };
}
