import { useCallback, useMemo } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export function usePrivacyLifecycleHandlers(reloadWorkData: () => Promise<void>) {
  const anonymizePerson = useCallback(async (personId: string, reason: string) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Personendienst ist nicht erreichbar.');
    await bridge.persons.anonymize(personId, reason);
    await reloadWorkData();
  }, [reloadWorkData]);

  const evaluateStatusExpiry = useCallback(async () => {
    const bridge = await waitForBridge();
    if (!bridge?.persons) throw new Error('Statusprüfung ist nicht erreichbar.');
    await bridge.persons.evaluateExpiry();
    await reloadWorkData();
  }, [reloadWorkData]);

  return useMemo(() => ({ anonymizePerson, evaluateStatusExpiry }), [anonymizePerson, evaluateStatusExpiry]);
}
