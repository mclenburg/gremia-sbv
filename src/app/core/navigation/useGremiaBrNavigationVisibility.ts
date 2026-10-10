import { useCallback, useEffect, useState } from 'react';
import { waitForBridge } from '../bridge/waitForBridge';
import { recordRendererDiagnostic } from '../diagnostics/rendererDiagnostics';
import type { ViewId } from './modules';

const SETTINGS_CHANGED_EVENT = 'gremia-sbv:gremia-br-settings-changed';

function hasConfiguredNavigation(settings?: { enabled?: boolean; serverUrl?: string; username?: string; hasStoredCredentials?: boolean }): boolean {
  return Boolean(settings?.enabled && settings.serverUrl?.trim() && settings.username?.trim() && settings.hasStoredCredentials);
}

export function useGremiaBrNavigationVisibility(
  unlocked: boolean,
  currentView: ViewId,
  setCurrentView: (view: ViewId) => void,
): boolean {
  const [configured, setConfigured] = useState(false);
  const reload = useCallback(async () => {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) {
        setConfigured(false);
        return;
      }
      setConfigured(hasConfiguredNavigation(await bridge.gremiaBr.getSettings()));
    } catch (error) {
      recordRendererDiagnostic('warning', 'Gremia.BR-Navigation konnte nicht aktualisiert werden.', error);
      setConfigured(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) {
      setConfigured(false);
      return;
    }
    void reload();
    window.addEventListener(SETTINGS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, reload);
  }, [reload, unlocked]);

  useEffect(() => {
    if (currentView === 'gremia_br' && !configured) setCurrentView('dashboard');
  }, [configured, currentView, setCurrentView]);

  return configured;
}
