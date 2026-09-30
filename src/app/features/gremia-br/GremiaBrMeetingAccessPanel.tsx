import { useEffect, useRef, useState } from 'react';
import type { GremiaBrDashboardOverview } from '../../../domain/models/gremia-br.model';
import { SearchableSelectInput } from '../../shared/components/IndustrialForm';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { buildBrMeetingDrafts } from './gremiaBrWorkspaceModel';
import { loadMeetingRemoteAccess } from './gremiaBrWorkspaceActions';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);
  const allowedIds = remoteMeetingIds(overview);
  const meetings = buildBrMeetingDrafts(overview).filter((item) => allowedIds.has(item.sourceId));
  const selected = meetings.find((item) => item.sourceId === meetingId);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  function selectMeeting(id: string) {
    requestSequence.current += 1;
    setMeetingId(id);
    setAccess(null);
    setError('');
    setBusy(false);
  }

  async function loadAccess() {
    if (!selected || busy) return;
    const sequence = ++requestSequence.current;
    setAccess(null);
    setError('');
    setBusy(true);
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
      if (requestSequence.current === sequence) setBusy(false);
    }
  }

  return (
    <IndustrialPanel kicker="Sitzungen" title="Tagesordnung und Remote-Zugang" ariaLabel="Tagesordnung und Remote-Zugang">
      {meetings.length ? (
        <SearchableSelectInput
          label="Hybride Sitzung suchen und auswählen"
          value={meetingId}
          options={meetings.map((item) => ({ value: item.sourceId, label: `${item.startsAt} · ${item.title}` }))}
          onValueChange={selectMeeting}
          placeholder="Termin oder Sitzungstitel tippen …"
        />
      ) : <p className="industrial-muted">Im aktuellen Arbeitsstand ist keine hybride Sitzung mit Remote-Zugang enthalten.</p>}
      {selected ? (
        <div className="industrial-form-section">
          <h3>Tagesordnung</h3>
          {selected.agenda.length ? <ol>{selected.agenda.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>
            : <p className="industrial-muted">Keine Tagesordnung im aktuellen Arbeitsstand.</p>}
          <ToolbarButton loading={busy} onClick={() => void loadAccess()}>Remote-Zugang abrufen</ToolbarButton>
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
