import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { CaseProcessType } from './caseWorkbenchTypes';
import type { CaseProcessDeleteReason, CaseProcessPrivacyAction } from '../../../domain/models/case-measure.model';
import { DangerButton, GhostButton, IndustrialButton } from '../../shared/components/IndustrialButton';
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
  onSubmit,
}: {
  target: { id: string; processType: CaseProcessType; label?: string } | null;
  onClose: () => void;
  onSubmit: (input: { reasonCode: CaseProcessDeleteReason; action: CaseProcessPrivacyAction }) => Promise<void>;
}) {
  const [reasonCode, setReasonCode] = useState<CaseProcessDeleteReason>('created_by_mistake');
  const [action, setAction] = useState<CaseProcessPrivacyAction>('anonymize');
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
    setAction(targetType === 'bem' ? 'anonymize' : 'delete');
    setConfirmation('');
    setError('');
  }, [targetId, targetType]);
  if (!target) return null;
  const label = target.label || PROCESS_LABELS[target.processType];
  const anonymizationAvailable = target.processType === 'bem';
  const effectiveAction: CaseProcessPrivacyAction = anonymizationAvailable ? action : 'delete';
  const requiredConfirmation = effectiveAction === 'anonymize' ? 'BEM ANONYMISIEREN' : 'MASSNAHME LÖSCHEN';
  const actionDescription = effectiveAction === 'anonymize'
    ? 'Das BEM-Verfahren bleibt als anonymisierter Nachweis erhalten. Personenbezüge, Kontakte, Freitexte und Prozesslinks werden neutralisiert; Fristen zum BEM werden entfernt.'
    : 'Die Maßnahme wird dauerhaft gelöscht. Verknüpfte Maßnahmennotizen und Fristen werden entfernt; Fall-Dokumente bleiben erhalten und verlieren nur den Maßnahmenbezug. Auditnachweise bleiben bestehen.';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (confirmation.trim() !== requiredConfirmation) return setError(`Bitte die Bestätigung exakt eingeben: ${requiredConfirmation}`);
    setBusy(true);
    try {
      await onSubmit({ reasonCode, action: effectiveAction });
      setConfirmation('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Datenschutzaktion konnte nicht ausgeführt werden.');
    } finally {
      setBusy(false);
    }
  }

  return <IndustrialModal
    title={`${label} bereinigen`}
    kicker="Manuelle Datenschutzentscheidung"
    description={actionDescription}
    icon={<Trash2 className="h-5 w-5" />}
    role="alertdialog"
    variant="danger"
    initialFocusRef={cancelRef}
    onClose={onClose}
    dataE2e="case-process-delete-dialog"
  >
    <form onSubmit={submit} className="privacy-review-form">
      {anonymizationAvailable ? <fieldset className="case-privacy-action-fieldset" aria-label="Datenschutzaktion auswählen">
        <legend>Gewünschte Aktion</legend>
        <div className="case-privacy-action-options">
          <label className={`case-privacy-action-option ${action === 'anonymize' ? 'is-selected' : ''}`}>
            <input type="radio" name="case-process-privacy-action" value="anonymize" checked={action === 'anonymize'} onChange={() => { setAction('anonymize'); setConfirmation(''); setError(''); }} />
            <span><strong>BEM anonymisieren</strong><small>Nachweis erhalten, Personenbezug aus BEM-Freitexten, Kontakten und Verknüpfungen entfernen.</small></span>
          </label>
          <label className={`case-privacy-action-option case-privacy-action-option-danger ${action === 'delete' ? 'is-selected' : ''}`}>
            <input type="radio" name="case-process-privacy-action" value="delete" checked={action === 'delete'} onChange={() => { setAction('delete'); setConfirmation(''); setError(''); }} />
            <span><strong>BEM vollständig löschen</strong><small>Vorgang dauerhaft entfernen; Dokumente bleiben nur ohne Maßnahmenbezug in der Fallakte.</small></span>
          </label>
        </div>
      </fieldset> : null}
      <label><span>Löschgrund</span><select className="industrial-select case-process-delete-reason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as CaseProcessDeleteReason)} required><option value="created_by_mistake">Fehleingabe</option><option value="duplicate">Doppelt angelegt</option><option value="no_longer_required">Nicht mehr erforderlich</option><option value="other">Sonstiger Grund</option></select></label>
      <label><span>Bestätigung</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={requiredConfirmation} required aria-invalid={Boolean(error && confirmation.trim() !== requiredConfirmation)} aria-describedby={error ? errorId : undefined} /></label>
      {error ? <p id={errorId} className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
      <div className="industrial-modal-actions">
        <GhostButton ref={cancelRef} onClick={onClose} disabled={busy}>Abbrechen</GhostButton>
        {effectiveAction === 'anonymize'
          ? <IndustrialButton type="submit" loading={busy}>BEM anonymisieren</IndustrialButton>
          : <DangerButton type="submit" loading={busy}><Trash2 className="h-4 w-4" aria-hidden="true" /> Maßnahme löschen</DangerButton>}
      </div>
    </form>
  </IndustrialModal>;
}
