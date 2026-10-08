import { useEffect, useState } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export function useEmployerQuotaSettings(): { workplaces: number | null; error: string } {
  const [workplaces, setWorkplaces] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.employerQuota) throw new Error('Einstellungen sind nicht verfügbar.');
        const settings = await bridge.employerQuota.getSettings();
        if (active) setWorkplaces(settings.chargeableWorkplaces);
      } catch {
        if (active) setError('Die Beschäftigungsquote konnte nicht geladen werden.');
      }
    })();
    return () => { active = false; };
  }, []);

  return { workplaces, error };
}
