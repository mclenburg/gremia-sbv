import { useCallback, useMemo } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { CaseRecord } from '../../core/models/case.model';

type Announce = (message: string, politeness?: 'polite' | 'assertive') => void;

export function useLegacyCaseBindingHandlers({ onCasesChanged, announce }: { onCasesChanged: () => Promise<void>; announce: Announce }) {
  const bindLegacyCase = useCallback(async (legacyCase: CaseRecord, protectedPersonId: string, reason: string) => {
    const bridge = await waitForBridge();
    if (!bridge?.cases?.bindLegacyCase) throw new Error('Falldienst für Legacy-Zuordnung ist nicht erreichbar.');
    await bridge.cases.bindLegacyCase({ caseId: legacyCase.id, protectedPersonId, reason });
    announce('Fallakte wurde mit Person verknüpft.', 'polite');
    await onCasesChanged();
  }, [announce, onCasesChanged]);


  const bulkMarkClosedLegacyCases = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.privacyReview?.bulkMarkClosedLegacy) throw new Error('Bulk-Datenschutzprüfung ist nicht erreichbar.');
    const result = await bridge.privacyReview.bulkMarkClosedLegacy();
    announce(result.message ?? `${result.marked} Altakten wurden vorgemerkt.`, 'polite');
    await onCasesChanged();
    return result;
  }, [announce, onCasesChanged]);

  return useMemo(() => ({ bindLegacyCase, bulkMarkClosedLegacyCases }), [bindLegacyCase, bulkMarkClosedLegacyCases]);
}
