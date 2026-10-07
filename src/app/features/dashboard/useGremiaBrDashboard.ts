import { useEffect, useState } from 'react';
import type { GremiaBrDashboardOverview } from '../../../domain/models/gremia-br.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

const EMPTY_GREMIA_BR_OVERVIEW: GremiaBrDashboardOverview = {
  accessibleCases: [],
  ownTasks: [],
  ownAccessApprovals: [],
  upcomingMeetings: [],
  meetingAgendas: {},
  pendingFollowUps: [],
  decisions: [],
  dueDecisions: [],
  overdueDecisions: [],
  relevanceSettings: { groups: [] },
  relevantMeetings: [],
  openDecisionCount: 0,
  dueDecisionCount: 0,
  overdueDecisionCount: 0,
};


async function readOverview() {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) return null;
  const settings = await bridge.gremiaBr.getSettings();
  const overview = await bridge.gremiaBr.getDashboardOverview();
  return { enabled: Boolean(settings.enabled), overview: overview as GremiaBrDashboardOverview };
}

export function useGremiaBrDashboard() {
  const announce = useAnnouncer();
  const [overview, setOverview] = useState<GremiaBrDashboardOverview>(EMPTY_GREMIA_BR_OVERVIEW);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function applyOverview(result: Awaited<ReturnType<typeof readOverview>>) {
    if (!result) return;
    setEnabled(result.enabled);
    setOverview(result.overview);
  }

  useEffect(() => {
    let active = true;
    readOverview().then((result) => {
      if (active) applyOverview(result);
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht geladen werden.');
    });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Dienst ist nicht erreichbar.');
      const result = await bridge.gremiaBr.refreshCache();
      setOverview(result.cached as GremiaBrDashboardOverview);
      setStatus(result.message);
      announce(result.message, 'polite');
      applyOverview(await readOverview());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht aktualisiert werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  return { overview, enabled, busy, status, error, onRefresh: refresh };
}
