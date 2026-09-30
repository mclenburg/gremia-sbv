import { useEffect, useRef, useState } from 'react';
import { waitForBridge } from '../bridge/waitForBridge';

export interface GremiaBrStartupNotice {
  kind: 'loading' | 'success' | 'error';
  message: string;
}

export function useGremiaBrStartupRefresh(unlocked: boolean) {
  const attempted = useRef(false);
  const [notice, setNotice] = useState<GremiaBrStartupNotice | null>(null);

  useEffect(() => {
    if (!unlocked || attempted.current) return;
    attempted.current = true;
    let active = true;
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.gremiaBr || !active) return;
        const settings = await bridge.gremiaBr.getSettings();
        if (!active || !settings.enabled || !settings.autoRefreshOnStartup || !settings.hasStoredCredentials) return;
        setNotice({ kind: 'loading', message: 'Gremia.BR wird nach dem Programmstart aktualisiert.' });
        const result = await bridge.gremiaBr.refreshOnStartup();
        if (active) setNotice({ kind: result.started ? 'success' : 'error', message: result.message });
      } catch (cause) {
        if (active) setNotice({ kind: 'error', message: cause instanceof Error
          ? `Gremia.BR-Startabruf fehlgeschlagen: ${cause.message}`
          : 'Gremia.BR-Startabruf fehlgeschlagen. Bitte im Gremia.BR-Arbeitsbereich manuell aktualisieren.' });
      }
    })();
    return () => { active = false; };
  }, [unlocked]);

  return { notice, dismissNotice: () => setNotice(null) };
}
