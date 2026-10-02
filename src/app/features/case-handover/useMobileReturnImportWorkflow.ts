import { useCallback, useState } from 'react';
import type { MobileCompanionReturnConflictDecision, MobileCompanionReturnImportResult, MobileCompanionReturnInspectResult } from '../../../domain/models/mobile-companion.model';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { requireCaseHandoverBridge } from './caseHandoverBridge';
import { buildMobileReturnConflictResolutions } from './mobileReturnConflictPolicy';

type SelectedMobileReturn = {
  filePath: string;
  fileName: string;
  inspection: MobileCompanionReturnInspectResult;
};

function toErrorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Mobile Rückgabe konnte nicht verarbeitet werden.';
}

export function useMobileReturnImportWorkflow(onImported?: () => Promise<void>) {
  const announce = useAnnouncer();
  const [selected, setSelected] = useState<SelectedMobileReturn | null>(null);
  const [result, setResult] = useState<MobileCompanionReturnImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [conflictDecisions, setConflictDecisions] = useState<Record<string, MobileCompanionReturnConflictDecision>>({});

  const showError = useCallback((cause: unknown) => {
    const text = toErrorText(cause);
    setError(text);
    setMessage('');
    announce(text, 'assertive');
  }, [announce]);

  const selectReturnFile = useCallback(async () => {
    setBusy(true);
    setError('');
    setMessage('');
    setResult(null);
    try {
      const handover = await requireCaseHandoverBridge();
      const picked = await handover.selectAndInspectMobileReturn();
      if (picked.canceled) return;
      setSelected(picked);
      setConflictDecisions({});
      const text = picked.inspection.canImport
        ? 'Mobile Rückgabe wurde geprüft und kann übernommen werden.'
        : 'Mobile Rückgabe wurde geprüft. Bitte Konflikte im Importplan klären.';
      setMessage(text);
      announce(text, 'polite');
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }, [announce, showError]);

  const importSelected = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const handover = await requireCaseHandoverBridge();
      const resolutions = buildMobileReturnConflictResolutions(selected.inspection, conflictDecisions);
      const imported = await handover.importMobileReturn({
        filePath: selected.filePath,
        resolutions,
      });
      setResult(imported);
      setSelected(null);
      await onImported?.();
      const text = 'Mobile Rückgabe wurde in den Desktop-Tresor übernommen.';
      setMessage(text);
      announce(text, 'polite');
    } catch (cause) {
      showError(cause);
    } finally {
      setBusy(false);
    }
  }, [announce, conflictDecisions, onImported, selected, showError]);

  return {
    selected,
    result,
    busy,
    error,
    message,
    conflictDecisions,
    setConflictDecision: (mobileId: string, decision: MobileCompanionReturnConflictDecision) =>
      setConflictDecisions((current) => ({ ...current, [mobileId]: decision })),
    selectReturnFile,
    importSelected,
    clearSelection: () => { setSelected(null); setConflictDecisions({}); },
  };
}
