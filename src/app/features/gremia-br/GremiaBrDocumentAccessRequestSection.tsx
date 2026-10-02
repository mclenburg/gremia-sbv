import { useState } from 'react';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { SelectInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { requestDocumentAccess } from './gremiaBrWorkspaceActions';

const DAY = 24 * 60 * 60 * 1000;

export function GremiaBrDocumentAccessRequestSection({ documentId, title }: { documentId: string; title: string }) {
  const announce = useAnnouncer();
  const [expanded, setExpanded] = useState(false);
  const [actionScope, setActionScope] = useState<'READ' | 'MANAGE'>('READ');
  const [durationMs, setDurationMs] = useState(DAY);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function submit() {
    if (busy || !purpose.trim()) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await requestDocumentAccess({ documentId, actionScope, purpose: purpose.trim(), durationMs });
      const message = result.status === 'PENDING'
        ? `Der Zugriffsantrag für „${title}“ wurde gestellt und wartet auf eine Entscheidung in Gremia.BR.`
        : 'Der Zugriffsantrag wurde von Gremia.BR bestätigt.';
      setPurpose('');
      setExpanded(false);
      setStatus(message);
      announce(message, 'polite');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Der Zugriffsantrag konnte nicht gestellt werden. Bitte erneut versuchen.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="industrial-form-section">
      <h4>Zugriff auf dieses Dokument</h4>
      <ToolbarButton disabled={busy} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>Zugriff beantragen</ToolbarButton>
      {expanded ? <>
        <p className="industrial-muted">Für „{title}“ wird eine Entscheidung einer berechtigten zweiten Person in Gremia.BR angefordert.</p>
        <div className="industrial-form-grid two-columns">
          <SelectInput label="Benötigter Zugriff" value={actionScope} onValueChange={(value) => setActionScope(value as 'READ' | 'MANAGE')} options={[{ value: 'READ', label: 'Lesen' }, { value: 'MANAGE', label: 'Bearbeiten' }]} disabled={busy} />
          <SelectInput label="Benötigte Laufzeit" value={String(durationMs)} onValueChange={(value) => setDurationMs(Number(value))} options={[{ value: String(DAY), label: '1 Tag' }, { value: String(7 * DAY), label: '7 Tage' }, { value: String(30 * DAY), label: '30 Tage' }]} disabled={busy} />
          <TextareaInput label="Begründung für den Zugriff" value={purpose} onValueChange={setPurpose} maxLength={1024} disabled={busy} wide required />
        </div>
        <div className="industrial-action-row">
          <IndustrialButton loading={busy} disabled={busy || !purpose.trim()} onClick={() => void submit()}>Antrag stellen</IndustrialButton>
        </div>
      </> : null}
      {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
      {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
    </div>
  );
}
