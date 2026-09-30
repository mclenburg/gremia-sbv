import { useState } from 'react';
import type { GremiaBrDocumentClassification, GremiaBrProtectionClass } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { changeDocumentClassification, loadDocumentClassification } from './gremiaBrWorkspaceActions';

const OPTIONS = [
  { value: 'INTERNAL', label: 'Intern' },
  { value: 'CONFIDENTIAL', label: 'Vertraulich' },
  { value: 'HIGH', label: 'Hoch schutzbedürftig' },
  { value: 'RESTRICTED', label: 'Streng beschränkt' },
];

export function GremiaBrClassificationSection({ documentId, title }: { documentId: string; title: string }) {
  const announce = useAnnouncer();
  const [current, setCurrent] = useState<GremiaBrDocumentClassification | null>(null);
  const [nextClass, setNextClass] = useState<GremiaBrProtectionClass | ''>('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    if (busy) return;
    setBusy(true); setError(''); setStatus(''); setPreview(false); setCurrent(null);
    try {
      const result = await loadDocumentClassification(documentId);
      setCurrent(result); setNextClass(result.protectionClass); setReason('');
      announce('Aktuelle Schutzklasse geladen.', 'polite');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Die Schutzklasse konnte nicht geladen werden.';
      setError(message); announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  async function change() {
    if (busy || !current || !nextClass || !preview || !reason.trim()) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const result = await changeDocumentClassification({
        documentId, protectionClass: nextClass, reason: reason.trim(), expectedVersion: current.version,
      });
      setCurrent(result); setNextClass(result.protectionClass); setReason(''); setPreview(false);
      setStatus('Schutzklasse geändert. Freigaben bei Bedarf bewusst neu abrufen.');
      announce('Schutzklasse geändert.', 'polite');
    } catch (cause) {
      setCurrent(null); setPreview(false);
      const message = cause instanceof Error ? cause.message : 'Die Schutzklasse konnte nicht geändert werden. Bitte den Stand neu abrufen.';
      setError(message); announce(message, 'assertive');
    } finally { setBusy(false); }
  }

  return <div className="industrial-form-section">
    <h4>Schutzklasse</h4>
    <ToolbarButton loading={busy} disabled={busy} onClick={() => void load()}>Klassifizierung abrufen</ToolbarButton>
    {current ? <>
      <p>Aktuell: {OPTIONS.find((option) => option.value === current.protectionClass)?.label}</p>
      <SelectInput label="Neue Schutzklasse" value={nextClass} options={OPTIONS}
        onValueChange={(value) => { setNextClass(value as GremiaBrProtectionClass); setPreview(false); }} disabled={busy} />
      <TextInput label="Grund für die Änderung" value={reason} maxLength={1024}
        onValueChange={(value) => { setReason(value); setPreview(false); }} disabled={busy} />
      {nextClass && nextClass !== current.protectionClass && reason.trim() ? <>
        <ToolbarButton disabled={busy} onClick={() => setPreview(true)}>Änderung prüfen</ToolbarButton>
        {preview ? <div className="industrial-form-section">
          <p>{title}: {OPTIONS.find((option) => option.value === current.protectionClass)?.label} → {OPTIONS.find((option) => option.value === nextClass)?.label}</p>
          <p>Grund: {reason.trim()}</p>
          <ToolbarButton loading={busy} disabled={busy} onClick={() => void change()}>Schutzklasse verbindlich ändern</ToolbarButton>
        </div> : null}
      </> : null}
    </> : null}
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
    {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
  </div>;
}
