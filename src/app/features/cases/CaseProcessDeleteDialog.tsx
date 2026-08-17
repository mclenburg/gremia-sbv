import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { CaseProcessType } from './caseWorkbenchTypes';
import type { CaseProcessDeleteReason } from '../../../domain/models/case-measure.model';
import { DangerButton, GhostButton } from '../../shared/components/IndustrialButton';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';

const PROCESS_LABELS: Record<CaseProcessType, string> = {
  prevention: 'Präventionsverfahren',
  bem: 'BEM-Verfahren',
  equalization: 'Gleichstellung / GdB',
  termination_hearing: 'Kündigungsanhörung',
  participation: 'SBV-Beteiligung',
  workplace_accommodation: 'Arbeitsplatzgestaltung',
};

export function CaseProcessDeleteDialog({
  target,
  onClose,
  onDelete,
}: {
  target: { id: string; processType: CaseProcessType; label?: string } | null;
  onClose: () => void;
  onDelete: (reasonCode: CaseProcessDeleteReason) => Promise<void>;
}) {
  const [reasonCode, setReasonCode] = useState<CaseProcessDeleteReason>('created_by_mistake');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const errorId = 'case-process-delete-error';
  const targetId = target?.id;
  const targetType = target?.processType;
  useEffect(() => {
    if (!targetId) return;
    setReasonCode('created_by_mistake');
    setConfirmation('');
    setError('');
  }, [targetId, targetType]);
  if (!target) return null;
  const label = target.label || PROCESS_LABELS[target.processType];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (confirmation.trim() !== 'MASSNAHME LÖSCHEN') return setError('Bitte die Bestätigung exakt eingeben: MASSNAHME LÖSCHEN');
    setBusy(true);
    try {
      await onDelete(reasonCode);
      setConfirmation('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Maßnahme konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  }

  return <IndustrialModal
    title={`${label} löschen?`}
    kicker="Fallmaßnahme"
    description="Die Maßnahme wird dauerhaft gelöscht. Verknüpfte Maßnahmennotizen und Fristen werden entfernt; Fall-Dokumente bleiben erhalten und verlieren nur den Maßnahmenbezug. Auditnachweise bleiben bestehen."
    icon={<Trash2 className="h-5 w-5" />}
    role="alertdialog"
    variant="danger"
    initialFocusRef={cancelRef}
    onClose={onClose}
    dataE2e="case-process-delete-dialog"
  >
    <form onSubmit={submit} className="privacy-review-form">
      <label><span>Löschgrund</span><select className="industrial-select case-process-delete-reason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as CaseProcessDeleteReason)} required><option value="created_by_mistake">Fehleingabe</option><option value="duplicate">Doppelt angelegt</option><option value="no_longer_required">Nicht mehr erforderlich</option><option value="other">Sonstiger Grund</option></select></label>
      <label><span>Bestätigung</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="MASSNAHME LÖSCHEN" required aria-invalid={Boolean(error && confirmation.trim() !== 'MASSNAHME LÖSCHEN')} aria-describedby={error ? errorId : undefined} /></label>
      {error ? <p id={errorId} className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
      <div className="industrial-modal-actions">
        <GhostButton ref={cancelRef} onClick={onClose} disabled={busy}>Abbrechen</GhostButton>
        <DangerButton type="submit" loading={busy}><Trash2 className="h-4 w-4" aria-hidden="true" /> Maßnahme löschen</DangerButton>
      </div>
    </form>
  </IndustrialModal>;
}
