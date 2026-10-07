import { CheckCircle2 } from 'lucide-react';
import type { GremiaBrDashboardOverview, GremiaBrRelevanceMatch } from '../../../domain/models/gremia-br.model';
import { formatDateTimeShort } from '../../shared/format/dates';
import { ToolbarButton } from '../../shared/components/IndustrialButton';

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

function MeetingMatch({ match }: { match: GremiaBrRelevanceMatch }) {
  const date = itemDate(match.item);
  return (
    <li className="dashboard-support-list-item">
      <strong>{itemTitle(match.item, 'BR-Sitzung')}</strong>
      {date && <span className="industrial-muted"> · {date}</span>}
      <div className="industrial-meta">Treffer: {match.matchedGroups.join(', ')}</div>
    </li>
  );
}

export function GremiaBrDashboardTile({ enabled, overview, busy, onRefresh }: {
  enabled: boolean; overview: GremiaBrDashboardOverview; busy: boolean; onRefresh: () => Promise<void>;
}) {
  if (!enabled) return null;
  const fetchedLabel = formatDateTimeShort(overview.lastFetchedAt);
  const lastFetchedLabel = fetchedLabel === '—' ? 'noch nicht abgerufen' : fetchedLabel;
  return (
    <div className="industrial-card no-card-hover dashboard-focus-card dashboard-focus-card-static" aria-label="Gremia.BR-Kooperationsbrücke">
      <span className="dashboard-focus-marker dashboard-focus-marker-attention">Aktiv</span>
      <CheckCircle2 className="industrial-icon-md" aria-hidden="true" />
      <strong>Gremia.BR</strong>
      <span>{overview.relevantMeetings.length} relevante Sitzung(en) im Lesecache.</span>
      <small>Letzter Datenabruf: {lastFetchedLabel}</small>
      <ToolbarButton className="dashboard-focus-secondary-action" disabled={busy} onClick={() => void onRefresh()}>
        {busy ? 'Abruf läuft …' : 'Abrufen'}
      </ToolbarButton>
    </div>
  );
}

export function GremiaBrMeetingAgenda({ enabled, overview, error, status }: {
  enabled: boolean; overview: GremiaBrDashboardOverview; error: string; status: string;
}) {
  if (!enabled) return null;
  const nextMeeting = overview.nextMeeting ?? overview.upcomingMeetings[0];
  const nextAgenda = agendaItemsForMeeting(overview, nextMeeting).slice(0, 5);
  const nextMeetingDate = itemDate(nextMeeting);
  return (
    <section className="industrial-card no-card-hover dashboard-support-card" aria-labelledby="dashboard-next-br-meeting-title">
      <div className="industrial-card-header compact">
        <div>
          <p className="industrial-kicker">Gremia.BR-Lesecache</p>
          <h4 id="dashboard-next-br-meeting-title">Nächste BR-Sitzung mit Agenda</h4>
        </div>
      </div>
      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
      {status && <div className="industrial-message industrial-message-success" role="status">{status}</div>}
      {nextMeeting ? (
        <>
          <p className="dashboard-support-headline">{itemTitle(nextMeeting, 'BR-Sitzung')}</p>
          {nextMeetingDate && <p className="industrial-meta">{nextMeetingDate}</p>}
          {nextAgenda.length ? (
            <ul className="dashboard-support-list">
              {nextAgenda.map((agenda, index) => <li key={`${itemTitle(agenda, 'TOP')}-${index}`}>{itemTitle(agenda, `TOP ${index + 1}`)}</li>)}
            </ul>
          ) : (
            <p className="industrial-muted">Keine Tagesordnung im aktuellen Lesecache.</p>
          )}
          {overview.relevantMeetings.length > 0 && (
            <div className="dashboard-support-section">
              <h5>SBV-relevante Tagesordnungstreffer</h5>
              <ul className="dashboard-support-list">
                {overview.relevantMeetings.slice(0, 3).map((match, index) => <MeetingMatch key={`${itemTitle(match.item, 'meeting')}-${index}`} match={match} />)}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="industrial-muted">Keine BR-Sitzung im lokalen Lesecache.</p>
      )}
    </section>
  );
}
