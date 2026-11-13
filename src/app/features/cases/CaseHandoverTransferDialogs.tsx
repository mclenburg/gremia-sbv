import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import { FormActions, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { GhostButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';

export function CaseHandoverTransferDialogs({ continueExpiredOpen, selectedCase, onCloseContinueExpired,
  onContinueExpired }: {
  continueExpiredOpen: boolean;
  selectedCase?: CaseRecord;
  onCloseContinueExpired: () => void;
  onContinueExpired: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!continueExpiredOpen) { setReason(''); setError(''); setBusy(false); }
  }, [continueExpiredOpen]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (reason.trim().length < 12) { setError('Bitte die weitere Bearbeitung konkret begründen.'); return; }
    setBusy(true);
    try { await onContinueExpired(reason.trim()); onCloseContinueExpired(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Bestätigung konnte nicht dokumentiert werden.'); }
    finally { setBusy(false); }
  }

  if (!continueExpiredOpen) return null;
  return <IndustrialModal title="Weiterbearbeitung abgelaufener Übergabedaten bestätigen"
    kicker="Fallübergabe / Vertretung"
    description="Abgelaufene Übergabedaten dürfen nur nach bewusster Prüfung weiterbearbeitet werden. Die Begründung wird nachvollziehbar dokumentiert."
    icon={<AlertTriangle className="industrial-icon-md" />} onClose={onCloseContinueExpired}>
    <form className="industrial-modal-grid" onSubmit={(event) => void submit(event)}>
      <TextInput label="Fallakte" value={selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : 'Keine Fallakte ausgewählt'}
        readOnly wide onValueChange={() => undefined} />
      <TextareaInput label="Begründung" value={reason} onValueChange={setReason} error={error} wide required
        placeholder="Warum ist die weitere Bearbeitung trotz abgelaufener Übergabe erforderlich?" />
      <p className="industrial-modal-preview industrial-modal-wide">Die Bestätigung ersetzt kein neues Übergabepaket. Sie dokumentiert nur, warum die bereits importierte lokale Übergabeakte weiterbearbeitet wird.</p>
      {error ? <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert"><AlertTriangle className="industrial-icon" />{error}</div> : null}
      <FormActions><GhostButton type="button" onClick={onCloseContinueExpired} disabled={busy}>Abbrechen</GhostButton>
        <IndustrialButton type="submit" disabled={busy || !selectedCase} loading={busy}>Weiterbearbeitung bestätigen</IndustrialButton></FormActions>
    </form>
  </IndustrialModal>;
}
