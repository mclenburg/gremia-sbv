import { useEffect, useRef, useState } from 'react';
import type { GremiaBrAgendaChanges, GremiaBrDashboardOverview } from '../../../domain/models/gremia-br.model';
import { SearchableSelectInput } from '../../shared/components/IndustrialForm';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { buildBrMeetingDrafts } from './gremiaBrWorkspaceModel';
import { loadMeetingAgendaChanges, loadMeetingRemoteAccess } from './gremiaBrWorkspaceActions';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

function remoteMeetingIds(overview: GremiaBrDashboardOverview): Set<string> {
  const meetings = [overview.currentMeeting, overview.nextMeeting, ...overview.upcomingMeetings];
  return new Set(meetings.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const meeting = item as Record<string, unknown>;
    return typeof meeting.id === 'string' && meeting.mode === 'HYBRID' && meeting.hasRemoteAccess === true
      ? [meeting.id] : [];
  }));
}

export function GremiaBrMeetingAccessPanel({ overview }: { overview: GremiaBrDashboardOverview }) {
  const announce = useAnnouncer();
  const [meetingId, setMeetingId] = useState('');
  const [access, setAccess] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<GremiaBrAgendaChanges | null>(null);
  const [busy, setBusy] = useState<'agenda' | 'access' | null>(null);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);
  const allowedIds = remoteMeetingIds(overview);
  const meetings = buildBrMeetingDrafts(overview);
  const selected = meetings.find((item) => item.sourceId === meetingId);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  function selectMeeting(id: string) {
    requestSequence.current += 1;
    setMeetingId(id);
    setAccess(null);
    setAgenda(null);
    setError('');
    setBusy(null);
  }

  async function loadAgenda() {
    if (!selected || busy) return;
    const sequence = ++requestSequence.current;
    setAgenda(null);
    setAccess(null);
    setError('');
    setBusy('agenda');
    try {
      const value = await loadMeetingAgendaChanges(selected.sourceId);
      if (requestSequence.current === sequence) {
        setAgenda(value);
        announce('Tagesordnung und Änderungen wurden geladen.', 'polite');
      }
    } catch (cause) {
      if (requestSequence.current === sequence) {
        const message = cause instanceof Error ? cause.message : 'Tagesordnung konnte nicht geladen werden. Bitte erneut versuchen.';
        setError(message);
        announce(message, 'assertive');
      }
    } finally {
      if (requestSequence.current === sequence) setBusy(null);
    }
  }

  async function loadAccess() {
    if (!selected || busy) return;
    const sequence = ++requestSequence.current;
    setAccess(null);
    setError('');
    setBusy('access');
    try {
      const value = await loadMeetingRemoteAccess(selected.sourceId);
      if (requestSequence.current === sequence) {
        setAccess(value);
        announce('Remote-Zugang wurde geladen.', 'polite');
      }
    } catch (cause) {
      if (requestSequence.current === sequence) {
        const message = cause instanceof Error ? cause.message : 'Remote-Zugang konnte nicht geladen werden. Bitte erneut versuchen.';
        setError(message);
        announce(message, 'assertive');
      }
    } finally {
      if (requestSequence.current === sequence) setBusy(null);
    }
  }

  return (
    <IndustrialPanel kicker="Sitzungen" title="Tagesordnung und Remote-Zugang" ariaLabel="Tagesordnung und Remote-Zugang">
      {meetings.length ? (
        <SearchableSelectInput
          label="Sitzung suchen und auswählen"
          value={meetingId}
          options={meetings.map((item) => ({ value: item.sourceId, label: `${item.startsAt} · ${item.title}` }))}
          onValueChange={selectMeeting}
          placeholder="Termin oder Sitzungstitel tippen …"
        />
      ) : <p className="industrial-muted">Im aktuellen Arbeitsstand ist keine Sitzung enthalten.</p>}
      {selected ? (
        <div className="industrial-form-section">
          <h3>Tagesordnung</h3>
          <ToolbarButton loading={busy === 'agenda'} disabled={busy !== null} onClick={() => void loadAgenda()}>Tagesordnung abrufen</ToolbarButton>
          {agenda ? (
            <div>
              {agenda.items.length ? <ol>{agenda.items.map((item, index) => <li key={`${index}-${item.title}`}>{item.title}</li>)}</ol>
                : <p className="industrial-muted">Die aktuelle Tagesordnung enthält keine TOPs.</p>}
              <h3>Änderungen seit der Einladung</h3>
              {!agenda.comparisonAvailable ? <p>Eine versandte Einladungsfassung ist nicht verfügbar. Änderungen können nicht verglichen werden.</p>
                : agenda.changes.length ? <ul>{agenda.changes.map((change, index) => (
                  <li key={`${index}-${change.kind}-${change.title}`}>
                    {change.kind === 'added' ? `Hinzugefügt: ${change.title}` : change.kind === 'removed'
                      ? `Entfernt: ${change.title}` : `Geändert: ${change.previousTitle} → ${change.title}`}
                  </li>
                ))}</ul> : <p>Seit der versandten Einladung wurden keine TOPs geändert.</p>}
            </div>
          ) : null}
          {allowedIds.has(selected.sourceId) ? <ToolbarButton loading={busy === 'access'} disabled={busy !== null} onClick={() => void loadAccess()}>Remote-Zugang abrufen</ToolbarButton> : null}
          {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
          {access !== null ? (
            <div aria-label="Remote-Zugang">
              <h3>Remote-Zugang</h3>
              <p className="industrial-confirm-message industrial-message" role="status">{access}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </IndustrialPanel>
  );
}
