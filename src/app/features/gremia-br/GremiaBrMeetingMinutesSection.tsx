import { useState } from 'react';
import type { GremiaBrMinutesSummary } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { loadMeetingMinutes } from './gremiaBrWorkspaceActions';

const KIND: Record<GremiaBrMinutesSummary['kind'], string> = {
  RESULT_MINUTES: 'Ergebnisniederschrift', PROCEEDINGS_MINUTES: 'Verlaufsniederschrift',
};
const STATUS: Record<GremiaBrMinutesSummary['status'], string> = {
  DRAFT: 'Entwurf', CONTENT_REVIEW: 'Inhaltsprüfung', CONTENT_FINAL: 'Inhalt abgeschlossen',
  SIGNATURE_PENDING: 'Unterschrift ausstehend', SIGNED_EVIDENCE_COMPLETE: 'Unterschriften vollständig', COMPLETED: 'Abgeschlossen',
};
const PROTECTION: Record<GremiaBrMinutesSummary['protectionClass'], string> = {
  INTERNAL: 'Intern', CONFIDENTIAL: 'Vertraulich', HIGH: 'Hoch schutzbedürftig', RESTRICTED: 'Streng beschränkt',
};

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
      announce(result ? 'Niederschriftstatus geladen.' : 'Noch keine Niederschrift verfügbar.', 'polite');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Die Niederschrift konnte nicht geladen werden.';
      setError(message);
      announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  return <div className="industrial-form-section">
    <h3>Niederschrift</h3>
    <ToolbarButton loading={busy} disabled={busy} onClick={() => void load()}>Niederschrift abrufen</ToolbarButton>
    {loaded && !minutes ? <p className="industrial-muted" role="status">Noch keine Niederschrift verfügbar.</p> : null}
    {minutes ? <>
      <dl className="industrial-meta-grid">
        <div><dt>Art</dt><dd>{KIND[minutes.kind]}</dd></div>
        <div><dt>Stand</dt><dd>{STATUS[minutes.status]}</dd></div>
        <div><dt>Schutzklasse</dt><dd>{PROTECTION[minutes.protectionClass]}</dd></div>
        <div><dt>Version</dt><dd>{minutes.version}</dd></div>
        <div><dt>Inhalt vollständig</dt><dd>{minutes.contentComplete ? 'Ja' : 'Nein'}</dd></div>
      </dl>
      {minutes.contentMissing.length ? <p>Offene Inhaltsangaben: {minutes.contentMissing.join(', ')}</p> : null}
      <p className="industrial-muted">Gremia.BR liefert hier Statusangaben, keinen Niederschrifttext.</p>
    </> : null}
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
  </div>;
}
