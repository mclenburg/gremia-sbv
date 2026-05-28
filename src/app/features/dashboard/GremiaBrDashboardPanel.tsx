import { useEffect, useState } from 'react';
import type { GremiaBrDashboardOverview, GremiaBrRelevanceMatch } from '../../core/models/gremia-br.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

const EMPTY_DASHBOARD: GremiaBrDashboardOverview = {
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

function itemTitle(item: unknown, fallback: string): string {
  if (!item || typeof item !== 'object') return fallback;
  const record = item as Record<string, unknown>;
  const value = record.titel ?? record.title ?? record.name ?? record.beschlusstext;
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function itemDate(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const value = record.datum ?? record.date ?? record.frist;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function MeetingMatch({ match }: { match: GremiaBrRelevanceMatch }) {
  return (
    <li className="case-note-content">
      <strong>{itemTitle(match.item, 'BR-Sitzung')}</strong>
      {itemDate(match.item) && <span className="text-zinc-500"> · {itemDate(match.item)}</span>}
      <div className="text-xs text-zinc-500">Treffer: {match.matchedGroups.join(', ')}</div>
    </li>
  );
}

export function GremiaBrDashboardPanel() {
  const announce = useAnnouncer();
  const [overview, setOverview] = useState<GremiaBrDashboardOverview>(EMPTY_DASHBOARD);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function loadCachedOverview() {
    const bridge = await waitForBridge();
    if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Dashboarddienst ist nicht erreichbar.');
    setOverview(await bridge.gremiaBr.getDashboardOverview());
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.gremiaBr) return;
        const next = await bridge.gremiaBr.getDashboardOverview();
        if (active) setOverview(next);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Gremia.BR-Dashboarddaten konnten nicht geladen werden.';
        setError(message);
        announce(message, 'assertive');
      }
    }
    void load();
    return () => { active = false; };
  }, [announce]);

  async function refresh() {
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Dashboarddienst ist nicht erreichbar.');
      const result = await bridge.gremiaBr.refreshCache();
      setOverview(result.cached as GremiaBrDashboardOverview);
      setStatus(result.message);
      announce(result.message, 'polite');
      await loadCachedOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht aktualisiert werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  const nextMeetingTitle = overview.nextMeeting ? itemTitle(overview.nextMeeting, 'BR-Sitzung') : 'Keine Sitzung im Lesecache.';
  const nextMeetingDate = overview.nextMeeting ? itemDate(overview.nextMeeting) : undefined;

  return (
    <section className="industrial-card mt-4" aria-labelledby="gremia-br-dashboard-title">
      <div className="industrial-card-header">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Gremia.BR-Lesecache</p>
          <h3 id="gremia-br-dashboard-title">BR-Sitzungen und Beschlüsse</h3>
        </div>
        <button type="button" className="industrial-button industrial-button-secondary" disabled={busy} onClick={() => void refresh()}>
          {busy ? 'Aktualisiere …' : 'Jetzt aus Gremia.BR abrufen'}
        </button>
      </div>

      <p className="text-sm text-zinc-400">
        Diese Kachel nutzt ausschließlich lokal gecachte Daten aus einem manuell ausgelösten Abruf. Es findet keine Hintergrundsynchronisation statt.
      </p>

      {error && <div className="industrial-message industrial-message-warning mt-4" role="alert">{error}</div>}
      {status && <div className="industrial-message industrial-message-success mt-4" role="status">{status}</div>}

      <dl className="industrial-meta-grid mt-4">
        <div><dt>Cache-Stand</dt><dd>{overview.lastFetchedAt ? overview.cacheAgeLabel ?? overview.lastFetchedAt : 'noch nicht aktualisiert'}</dd></div>
        <div><dt>SBV-relevante Sitzungen</dt><dd>{overview.relevantMeetings.length}</dd></div>
        <div><dt>Fällige Beschlüsse</dt><dd>{overview.dueDecisionCount}</dd></div>
        <div><dt>Überfällige Beschlüsse</dt><dd>{overview.overdueDecisionCount}</dd></div>
      </dl>

      <div className="industrial-subsection compact mt-4">
        <h4>Nächste BR-Sitzung</h4>
        <p>{nextMeetingTitle}</p>
        {nextMeetingDate ? <p className="text-xs text-zinc-500">{nextMeetingDate}</p> : null}
      </div>

      <div className="industrial-subsection compact mt-4">
        <h4>SBV-relevante kommende Sitzungen</h4>
        {overview.relevantMeetings.length ? (
          <ul className="space-y-2">
            {overview.relevantMeetings.slice(0, 5).map((match, index) => <MeetingMatch key={`${itemTitle(match.item, 'meeting')}-${index}`} match={match} />)}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Keine relevanten Tagesordnungstreffer im aktuellen Lesecache.</p>
        )}
      </div>
    </section>
  );
}
