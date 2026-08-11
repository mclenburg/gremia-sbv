import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import { AUDIT_LOG_RETENTION_NOTICE } from '../../core/copy/privacyNotices';
import { DangerButton, GhostButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';

export type CasePrivacyActionMode = 'anonymize' | 'delete';

export function CasePrivacyActionDialog({
  open,
  record,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record?: CaseRecord;
  onClose: () => void;
  onSubmit: (input: { mode: CasePrivacyActionMode; reason: string; confirmation: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<CasePrivacyActionMode>('anonymize');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const errorId = 'case-privacy-action-error';
  useEffect(() => {
    if (!open) return;
    setMode('anonymize');
    setReason('');
    setConfirmation('');
    setError('');
  }, [open, record?.id]);
  if (!open || !record) return null;

  const expectedConfirmation = mode === 'anonymize' ? 'FALL ANONYMISIEREN' : 'FALL LÖSCHEN';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!reason.trim()) return setError('Bitte einen Grund dokumentieren.');
    if (confirmation.trim() !== expectedConfirmation) return setError(`Bitte die Bestätigung exakt eingeben: ${expectedConfirmation}`);
    setBusy(true);
    try {
      await onSubmit({ mode, reason: reason.trim(), confirmation: confirmation.trim() });
      setReason('');
      setConfirmation('');
      setMode('anonymize');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Datenschutzaktion konnte nicht abgeschlossen werden.');
    } finally {
      setBusy(false);
    }
  }

  return <IndustrialModal
    className="case-privacy-action-dialog"
    title="Fallakte: Datenschutzaktion"
    kicker="Datenschutz-Lifecycle"
    description={`Für ${record.caseNumber} bewusst zwischen Anonymisierung und endgültiger Löschung wählen.`}
    icon={<ShieldAlert className="h-5 w-5" />}
    role="alertdialog"
    variant="danger"
    initialFocusRef={cancelRef}
    onClose={onClose}
    dataE2e="case-privacy-action-dialog"
  >
    <p className="industrial-message industrial-message-info case-privacy-audit-note">{AUDIT_LOG_RETENTION_NOTICE}</p>
    <form onSubmit={submit} className="privacy-review-form case-privacy-action-form">
      <fieldset className="case-privacy-action-fieldset">
        <legend>Gewünschte Aktion</legend>
        <div className="case-privacy-action-options">
          <label className={`case-privacy-action-option ${mode === 'anonymize' ? 'is-selected' : ''}`}>
            <input type="radio" name="case-privacy-action" checked={mode === 'anonymize'} onChange={() => { setMode('anonymize'); setConfirmation(''); }} />
            <span><strong>Anonymisieren</strong><small>Personenbezug entfernen; fachliche Restdaten nur soweit erforderlich erhalten.</small></span>
          </label>
          <label className={`case-privacy-action-option case-privacy-action-option-danger ${mode === 'delete' ? 'is-selected' : ''}`}>
            <input type="radio" name="case-privacy-action" checked={mode === 'delete'} onChange={() => { setMode('delete'); setConfirmation(''); }} />
            <span><strong>Endgültig löschen</strong><small>Fallakte und zugehörige Fachdaten dauerhaft entfernen.</small></span>
          </label>
        </div>
      </fieldset>
      <div className="case-privacy-action-fields">
        <label><span>Grund</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} required aria-invalid={Boolean(error && !reason.trim())} aria-describedby={error ? errorId : undefined} /></label>
        <label><span>Bestätigung</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={expectedConfirmation} required aria-invalid={Boolean(error && confirmation.trim() !== expectedConfirmation)} aria-describedby={error ? errorId : undefined} /><small className="industrial-muted">Zur Sicherheit exakt „{expectedConfirmation}“ eingeben.</small></label>
      </div>
      {error ? <p id={errorId} className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
      <div className="industrial-modal-actions">
        <GhostButton ref={cancelRef} onClick={onClose} disabled={busy}>Abbrechen</GhostButton>
        {mode === 'delete'
          ? <DangerButton type="submit" loading={busy}><Trash2 className="h-4 w-4" aria-hidden="true" /> Fall löschen</DangerButton>
          : <IndustrialButton type="submit" loading={busy}><ShieldAlert className="h-4 w-4" aria-hidden="true" /> Fall anonymisieren</IndustrialButton>}
      </div>
    </form>
  </IndustrialModal>;
}
