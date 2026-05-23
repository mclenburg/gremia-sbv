import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, RefreshCw, ShieldCheck, TimerReset } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { DeadlineDashboardItem, DeadlineRecord } from '../../core/models/deadline.model';
import { DeadlineDashboardPanel } from '../deadlines/DeadlineDashboardPanel';
import type { GremiaBrDashboardOverview, GremiaBrRelevanceMatch } from '../../core/models/gremia-br.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { buildDashboardFocusSummary, type DashboardComplianceLike } from './dashboardFocusPolicy';
import type { ViewId } from '../../core/navigation/modules';

type DashboardFocusOverviewProps = {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  dashboardItems: DeadlineDashboardItem[];
  onNavigate: (view: ViewId) => void;
  onEditDeadline: (deadline: DeadlineDashboardItem) => void;
  onCompleteDeadline: (deadline: DeadlineDashboardItem) => void;
};

const EMPTY_GREMIA_BR_OVERVIEW: GremiaBrDashboardOverview = {
  upcomingMeetings: [],
  meetingAgendas: {},
  decisions: [],
  dueDecisions: [],
  overdueDecisions: [],
  relevanceSettings: { groups: [] },
  relevantMeetings: [],
  openDecisionCount: 0,
  dueDecisionCount: 0,
  overdueDecisionCount: 0,
};

function markerClass(marker: string): string {
  if (marker === 'warning') return 'dashboard-focus-marker dashboard-focus-marker-warning';
  if (marker === 'attention') return 'dashboard-focus-marker dashboard-focus-marker-attention';
  if (marker === 'ok') return 'dashboard-focus-marker dashboard-focus-marker-ok';
  return 'dashboard-focus-marker';
}

function markerText(marker: string): string {
  if (marker === 'warning') return 'Handlungsbedarf';
  if (marker === 'attention') return 'Beachten';
  if (marker === 'ok') return 'OK';
  return 'Info';
}

function itemValue(item: unknown, keys: string[]): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function itemTitle(item: unknown, fallback: string): string {
  return itemValue(item, ['titel', 'title', 'name', 'beschlusstext']) ?? fallback;
}

function itemDate(item: unknown): string | undefined {
  return itemValue(item, ['datum', 'date', 'frist', 'startsAt', 'start']);
}

function agendaItemsForMeeting(overview: GremiaBrDashboardOverview, meeting: unknown): unknown[] {
  if (!meeting || typeof meeting !== 'object') return [];
  const record = meeting as Record<string, unknown>;
  const id = record.id;
  if (typeof id !== 'string') return [];
  const agenda = overview.meetingAgendas[id];
  return Array.isArray(agenda) ? agenda : [];
}

export function formatGermanDateTime(value?: string): string {
  if (!value) return 'noch nicht abgerufen';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'noch nicht abgerufen';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function resolveGremiaBrDashboardTile({ enabled, overview }: { enabled: boolean; overview: GremiaBrDashboardOverview }): { relevantMeetingCount: number; lastFetchedLabel: string } | null {
  if (!enabled) return null;
  return {
    relevantMeetingCount: overview.relevantMeetings.length,
    lastFetchedLabel: formatGermanDateTime(overview.lastFetchedAt),
  };
}

export function resolveNextGremiaBrMeetingAgenda({ enabled, overview }: { enabled: boolean; overview: GremiaBrDashboardOverview }): { meeting: unknown; agenda: unknown[] } | null {
  if (!enabled) return null;
  const meeting = overview.nextMeeting ?? overview.upcomingMeetings[0];
  if (!meeting) return null;
  return { meeting, agenda: agendaItemsForMeeting(overview, meeting).slice(0, 5) };
}

function MeetingMatch({ match }: { match: GremiaBrRelevanceMatch }) {
  return (
    <li className="dashboard-support-list-item">
      <strong>{itemTitle(match.item, 'BR-Sitzung')}</strong>
      {itemDate(match.item) && <span className="text-zinc-500"> · {itemDate(match.item)}</span>}
      <div className="text-xs text-zinc-500">Treffer: {match.matchedGroups.join(', ')}</div>
    </li>
  );
}

export function DashboardFocusOverview({ cases, deadlines, dashboardItems, onNavigate, onEditDeadline, onCompleteDeadline }: DashboardFocusOverviewProps) {
  const announce = useAnnouncer();
  const [compliance, setCompliance] = useState<DashboardComplianceLike | null>(null);
  const [complianceError, setComplianceError] = useState('');
  const [gremiaBrOverview, setGremiaBrOverview] = useState<GremiaBrDashboardOverview>(EMPTY_GREMIA_BR_OVERVIEW);
  const [gremiaBrEnabled, setGremiaBrEnabled] = useState(false);
  const [gremiaBrBusy, setGremiaBrBusy] = useState(false);
  const [gremiaBrStatus, setGremiaBrStatus] = useState('');
  const [gremiaBrError, setGremiaBrError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadComplianceStatus() {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.compliance) return;
        const [auditStatus, databaseStatus] = await Promise.all([
          bridge.compliance.auditChainStatus(),
          bridge.compliance.databaseIntegrityStatus(),
        ]);
        if (!active) return;
        const audit = auditStatus as unknown as Record<string, unknown>;
        const database = databaseStatus as unknown as Record<string, unknown>;
        const auditIssues = Number(audit.issueCount ?? audit.warningCount ?? audit.errorCount ?? 0);
        const databaseIssues = Number(database.issueCount ?? database.warningCount ?? database.errorCount ?? 0);
        setCompliance({ ok: Boolean(auditStatus.ok && databaseStatus.ok), issueCount: auditIssues + databaseIssues, repairRequired: Boolean(database.repairRequired) });
        setComplianceError('');
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Compliance-Status konnte nicht geladen werden.';
        setCompliance({ ok: false, issueCount: 1, repairRequired: false });
        setComplianceError(message);
        announce(message, 'assertive');
      }
    }
    void loadComplianceStatus();
    return () => { active = false; };
  }, [announce]);

  async function loadGremiaBrOverview(active = true) {
    const bridge = await waitForBridge();
    if (!bridge?.gremiaBr) return;
    const settings = await bridge.gremiaBr.getSettings();
    const overview = await bridge.gremiaBr.getDashboardOverview();
    if (!active) return;
    setGremiaBrEnabled(Boolean(settings.enabled));
    setGremiaBrOverview(overview as GremiaBrDashboardOverview);
  }

  useEffect(() => {
    let active = true;
    loadGremiaBrOverview(active).catch((err) => {
      if (!active) return;
      const message = err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht geladen werden.';
      setGremiaBrError(message);
    });
    return () => { active = false; };
  }, []);

  async function refreshGremiaBrCache() {
    setGremiaBrBusy(true);
    setGremiaBrStatus('');
    setGremiaBrError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Dienst ist nicht erreichbar.');
      const result = await bridge.gremiaBr.refreshCache();
      setGremiaBrOverview(result.cached as GremiaBrDashboardOverview);
      setGremiaBrStatus(result.message);
      announce(result.message, 'polite');
      await loadGremiaBrOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gremia.BR-Lesecache konnte nicht aktualisiert werden.';
      setGremiaBrError(message);
      announce(message, 'assertive');
    } finally {
      setGremiaBrBusy(false);
    }
  }

  const deadlinesForSummary = dashboardItems.length ? dashboardItems : deadlines;
  const summary = useMemo(() => buildDashboardFocusSummary({ cases, deadlines: deadlinesForSummary, compliance }), [cases, compliance, deadlinesForSummary]);
  const gremiaBrTile = resolveGremiaBrDashboardTile({ enabled: gremiaBrEnabled, overview: gremiaBrOverview });
  const nextMeetingAgenda = resolveNextGremiaBrMeetingAgenda({ enabled: gremiaBrEnabled, overview: gremiaBrOverview });
  const nextMeeting = nextMeetingAgenda?.meeting;
  const nextAgenda = nextMeetingAgenda?.agenda ?? [];

  return (
    <section className="dashboard-focus" aria-labelledby="dashboard-focus-title">
      <div className="industrial-card-header">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Arbeitsübersicht</p>
          <h3 id="dashboard-focus-title">Wesentliches auf einen Blick</h3>
        </div>
      </div>
      <div className="dashboard-focus-grid mt-4">
        <button type="button" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('cases')}>
          <span className={markerClass(summary.cases.marker)}>{markerText(summary.cases.marker)}</span>
          <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          <strong>Fälle</strong>
          <span>{summary.cases.open} offen · {summary.cases.total} gesamt</span>
        </button>

        <button type="button" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('deadlines')}>
          <span className={markerClass(summary.deadlines.marker)}>{markerText(summary.deadlines.marker)}</span>
          {summary.deadlines.marker === 'warning' ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <TimerReset className="h-5 w-5" aria-hidden="true" />}
          <strong>Fristen</strong>
          <span>{summary.deadlines.totalOpen} offen · {summary.deadlines.dueSoon} anstehend · {summary.deadlines.overdue} überschritten</span>
        </button>

        <button type="button" className="industrial-card dashboard-focus-card" onClick={() => onNavigate('compliance')}>
          <span className={markerClass(summary.compliance.marker)}>{markerText(summary.compliance.marker)}</span>
          {summary.compliance.ok ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          <strong>Compliance-Center</strong>
          <span>{summary.compliance.ok ? 'Auditkette und Datenbankintegrität ohne Warnung.' : `${summary.compliance.warnings || 1} Warnung(en) prüfen.`}</span>
          {complianceError && <small>{complianceError}</small>}
        </button>

        {gremiaBrTile && (
          <div className="industrial-card no-card-hover dashboard-focus-card dashboard-focus-card-static" aria-label="Gremia.BR-Lesebrücke">
            <span className="dashboard-focus-marker dashboard-focus-marker-attention">Aktiv</span>
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <strong>Gremia.BR</strong>
            <span>{gremiaBrTile.relevantMeetingCount} relevante Sitzung(en) im Lesecache.</span>
            <small>Letzter Datenabruf: {gremiaBrTile.lastFetchedLabel}</small>
            <button type="button" className="industrial-button industrial-button-secondary dashboard-focus-secondary-action" disabled={gremiaBrBusy} onClick={() => void refreshGremiaBrCache()}>
              {gremiaBrBusy ? 'Abruf läuft …' : 'Abrufen'}
            </button>
          </div>
        )}
      </div>

      <div className="dashboard-support-grid mt-4">
        {gremiaBrEnabled && (
          <section className="industrial-card no-card-hover dashboard-support-card" aria-labelledby="dashboard-next-br-meeting-title">
            <div className="industrial-card-header compact">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Gremia.BR-Lesecache</p>
                <h4 id="dashboard-next-br-meeting-title">Nächste BR-Sitzung mit Agenda</h4>
              </div>
            </div>
            {gremiaBrError && <div className="industrial-message industrial-message-warning mt-3" role="alert">{gremiaBrError}</div>}
            {gremiaBrStatus && <div className="industrial-message industrial-message-success mt-3" role="status">{gremiaBrStatus}</div>}
            {nextMeeting ? (
              <>
                <p className="dashboard-support-headline">{itemTitle(nextMeeting, 'BR-Sitzung')}</p>
                {itemDate(nextMeeting) && <p className="text-xs text-zinc-500">{itemDate(nextMeeting)}</p>}
                {nextAgenda.length ? (
                  <ul className="dashboard-support-list mt-3">
                    {nextAgenda.map((agenda, index) => <li key={`${itemTitle(agenda, 'TOP')}-${index}`}>{itemTitle(agenda, `TOP ${index + 1}`)}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 mt-3">Keine Tagesordnung im aktuellen Lesecache.</p>
                )}
                {gremiaBrOverview.relevantMeetings.length > 0 && (
                  <div className="mt-4">
                    <h5>SBV-relevante Tagesordnungstreffer</h5>
                    <ul className="dashboard-support-list mt-2">
                      {gremiaBrOverview.relevantMeetings.slice(0, 3).map((match, index) => <MeetingMatch key={`${itemTitle(match.item, 'meeting')}-${index}`} match={match} />)}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Keine BR-Sitzung im lokalen Lesecache.</p>
            )}
          </section>
        )}

        <DeadlineDashboardPanel
          items={dashboardItems}
          cases={cases}
          onEdit={onEditDeadline}
          onComplete={onCompleteDeadline}
        />
      </div>
    </section>
  );
}
