import { useState } from 'react';
import type { GremiaBrMinutesSummary } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { loadMeetingMinutes } from './gremiaBrWorkspaceActions';

export function GremiaBrMeetingMinutesSection({ meetingId }: { meetingId: string }) {
  const announce = useAnnouncer();
  const [minutes, setMinutes] = useState<GremiaBrMinutesSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (busy) return;
    setBusy(true);
    setError('');
    setMinutes(null);
    setLoaded(false);
    try {
      const result = await loadMeetingMinutes(meetingId);
      setMinutes(result);
      setLoaded(true);
      announce(result ? 'Niederschrift vorhanden.' : 'Noch keine Niederschrift verfügbar.', 'polite');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Die Niederschrift konnte nicht geladen werden.';
      setError(message);
      announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  return <div className="industrial-form-section">
    <h3>Niederschrift</h3>
    <ToolbarButton loading={busy} disabled={busy} onClick={() => void load()}>Niederschrift prüfen</ToolbarButton>
    {loaded && !minutes ? <p className="industrial-muted" role="status">Noch keine Niederschrift verfügbar.</p> : null}
    {minutes ? <p className="industrial-muted" role="status">Niederschrift vorhanden.</p> : null}
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
  </div>;
}
