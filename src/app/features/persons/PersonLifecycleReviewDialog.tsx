import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewItemRecord } from '../../../domain/models/privacy-review.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels, type ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import { AUDIT_LOG_RETENTION_NOTICE } from '../../core/copy/privacyNotices';
import { DateInput, FormActions, IndustrialButton, IndustrialModal, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialControls';

const reasonLabels: Record<string, string> = {
  status_expired: 'Status abgelaufen',
  employment_ended: 'Beschäftigung beendet',
  linked_person_anonymized: 'Person anonymisiert',
  linked_person_deleted: 'Person gelöscht',
  legacy_unlinked: 'Altfall ohne sicheren Personenbezug',
  multiple_person_links: 'Mehrere aktive Personenbezüge',
  no_person_link: 'Kein Personenbezug',
  handover_imported: 'Importierte Übergabedaten',
  retention_due: 'Fortspeicherung erneut prüfen'
};

const priorityLabels: Record<string, string> = {
  critical: 'kritisch',
  high: 'hoch',
  normal: 'normal',
  low: 'niedrig'
};

function InlineAnonymizationHelp() {
  const helpText = 'Freitexte werden nicht blind anonymisiert. Mit ~~ markierte Textstellen werden zunächst als Vormerkung mit Klartext gespeichert und erst bei einer später bestätigten Fallanonymisierung durch [anonymisiert] ersetzt.';
  return (
    <span className="industrial-help-dot" title={helpText} role="img" aria-label={helpText} tabIndex={0}>
      ?
    </span>
  );
}

export interface PersonLifecycleReviewDialogProps {
  person: ProtectedPersonRecord;
  open: boolean;
  reviews: PrivacyReviewItemRecord[];
  loading: boolean;
  onOpen: () => Promise<void>;
  onClose: () => void;
  onDocumentRetention: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onScheduleLater: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onClear: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onAnonymizeCase: (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation' | 'anonymizationMode'>>) => Promise<PrivacyReviewActionResult>;
  onDeleteCase: (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>) => Promise<PrivacyReviewActionResult>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}

export function PersonLifecycleReviewDialog({
  person,
  open,
  reviews,
  loading,
  onOpen,
  onClose,
  onDocumentRetention,
  onScheduleLater,
  onClear,
  onAnonymizeCase,
  onDeleteCase,
  onMessage,
  onError
}: PersonLifecycleReviewDialogProps) {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [action, setAction] = useState<'retention' | 'later' | 'clear' | 'anonymize_marked' | 'anonymize_all' | 'delete'>('retention');
  const [reason, setReason] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const formErrorId = `privacy-review-error-${person.id}`;
  const [formError, setFormError] = useState('');

  const requiresReview = reviews.length > 0 || ['expired_review_required', 'anonymization_pending', 'retention_documented'].includes(person.lifecycleState);
  const selectedReview = reviews.find((review) => review.caseId === selectedCaseId) ?? reviews[0];

  useEffect(() => {
    if (!open) openButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (reviews[0] && !selectedCaseId) setSelectedCaseId(reviews[0].caseId);
  }, [reviews, selectedCaseId]);

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const caseId = selectedReview?.caseId;
    if (!caseId) {
      setFormError('Bitte eine prüfpflichtige Fallakte auswählen.');
      return;
    }
    try {
      let result: PrivacyReviewActionResult;
      if (action === 'retention') result = await onDocumentRetention({ caseId, reason, reviewAt });
      else if (action === 'later') result = await onScheduleLater({ caseId, reason, reviewAt });
      else if (action === 'clear') result = await onClear({ caseId, reason });
      else if (action === 'anonymize_marked' || action === 'anonymize_all') result = await onAnonymizeCase({ caseId, reason, confirmation, anonymizationMode: action === 'anonymize_marked' ? 'marked_free_text' : 'replace_all_free_text' });
      else result = await onDeleteCase({ caseId, reason, confirmation });
      if (!result.ok) throw new Error(result.error ?? 'Die Aktion konnte nicht abgeschlossen werden.');
      setReason('');
      setReviewAt('');
      setConfirmation('');
      onMessage(result.message ?? 'Datenschutzprüfung wurde aktualisiert.');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Datenschutzprüfung konnte nicht aktualisiert werden.';
      setFormError(message);
      onError(message);
    }
  }

  return (
    <section className={`industrial-alert person-lifecycle-review ${requiresReview ? 'needs-review' : ''}`} aria-label="Datenschutzprüfung zum Personenstatus">
      <strong>Datenschutz-Lifecycle: {lifecycleStateLabels[person.lifecycleState]}</strong>
      <div className="person-lifecycle-review-summary">
        <p>Bei Statusablauf, Beschäftigungsende, Anonymisierung oder Löschung werden verbundene Fälle prüfpflichtig.</p>
        <InlineAnonymizationHelp />
      </div>
      <button type="button" className="industrial-secondary-button" ref={openButtonRef} onClick={() => void onOpen()} data-e2e="open-privacy-review-dialog">
        Datenschutzprüfung öffnen
      </button>

      {open && (
        <IndustrialModal
          title="Prüfung bei Zweckfortfall"
          kicker="Datenschutz-Lifecycle"
          description="Entscheiden Sie pro Fallakte, ob der Status aktualisiert, die Fortspeicherung begründet, anonymisiert, gelöscht oder später erneut geprüft wird."
          className="person-privacy-review-dialog"
          onClose={onClose}
          dataE2e="privacy-review-dialog"
          actions={<IndustrialButton type="button" variant="secondary" onClick={onClose}>Schließen</IndustrialButton>}
        >
            <div className="industrial-muted person-lifecycle-review-summary">
              <p>Entscheiden Sie pro Fallakte, ob der Status aktualisiert, die Fortspeicherung begründet, anonymisiert, gelöscht oder später erneut geprüft wird.</p>
              <InlineAnonymizationHelp />
            </div>

            <dl className="person-detail-grid privacy-context-grid">
              <div><dt>Personenstatus</dt><dd>{protectionStatusLabels[person.protectionStatus]}</dd></div>
              <div><dt>Status gültig bis</dt><dd>{person.statusValidUntil ?? '—'}</dd></div>
              <div><dt>Beschäftigung</dt><dd>{employmentStateLabels[person.employmentState]}</dd></div>
              <div><dt>Beschäftigungsende</dt><dd>{person.leftCompanyAt ?? '—'}</dd></div>
            </dl>

            {loading && <p className="industrial-muted">Datenschutzprüfungen werden geladen …</p>}
            {!loading && !reviews.length && <p className="industrial-message">Aktuell liegen keine offenen Datenschutzprüfungen zu dieser Person vor.</p>}

            {!!reviews.length && (
              <form className="privacy-review-form" onSubmit={submitAction}>
                <SelectInput
                  label="Prüfpflichtige Fallakte"
                  value={selectedReview?.caseId ?? ''}
                  onValueChange={setSelectedCaseId}
                  options={reviews.map((review) => ({
                    value: review.caseId,
                    label: `${review.context.caseFile?.caseNumber ?? review.caseId} · ${reasonLabels[review.reason] ?? review.reason} · Priorität ${priorityLabels[review.priority] ?? review.priority}`,
                  }))}
                  required
                />

                {selectedReview && (
                  <dl className="person-detail-grid privacy-context-grid">
                    <div><dt>Fallstatus</dt><dd>{selectedReview.context.caseFile?.status ?? '—'}</dd></div>
                    <div><dt>Offene Fristen</dt><dd>{selectedReview.context.openDeadlineCount}</dd></div>
                    <div><dt>Laufende Maßnahmen</dt><dd>{selectedReview.context.runningMeasureCount}</dd></div>
                    <div><dt>Letzte Aktivität</dt><dd>{selectedReview.context.lastActivityAt ?? '—'}</dd></div>
                    <div><dt>Dokumente</dt><dd>{selectedReview.context.linkedDocumentCount}</dd></div>
                    <div><dt>Freitextprüfung</dt><dd>{selectedReview.freeTextReviewRequired ? 'erforderlich' : 'nicht markiert'}</dd></div>
                  </dl>
                )}

                <label>
                  <span>Aktion</span>
                  <select className="industrial-select" value={action} onChange={(event) => setAction(event.target.value as typeof action)} required>
                    <option value="retention">Fortspeicherung begründen</option>
                    <option value="later">später erneut prüfen</option>
                    <option value="clear">Prüfung abschließen / Status aktualisiert</option>
                    <option value="anonymize_marked">Fallakte anonymisieren · nur vorgemerkte Freitexte</option>
                    <option value="anonymize_all">Fallakte anonymisieren · alle Freitexte ersetzen</option>
                    <option value="delete">Fallakte löschen</option>
                  </select>
                </label>
                <TextareaInput label="Grund / Prüfbemerkung" value={reason} onValueChange={setReason} aria-describedby={formError ? formErrorId : undefined} required />
                {(action === 'retention' || action === 'later') && (
                  <DateInput label="Erneut prüfen am" value={reviewAt} onValueChange={setReviewAt} aria-describedby={formError ? formErrorId : undefined} required />
                )}
                {action === 'anonymize_marked' ? <p className="industrial-message industrial-message-warning" role="note">Nicht vorgemerkte personenbezogene Angaben in Freitexten bleiben erhalten und müssen anschließend manuell geprüft werden. Beteiligtenfelder und Personen-/Kontaktverknüpfungen werden immer entfernt.</p> : null}
                {(action === 'anonymize_marked' || action === 'anonymize_all' || action === 'delete') && (
                  <>
                    <p className="industrial-message industrial-message-info" data-e2e="audit-log-retention-notice">
                      {AUDIT_LOG_RETENTION_NOTICE}
                    </p>
                    <TextInput label="Bestätigung" value={confirmation} onValueChange={setConfirmation} placeholder={action === 'anonymize_marked' || action === 'anonymize_all' ? 'FALL ANONYMISIEREN' : 'FALL LÖSCHEN'} aria-describedby={formError ? formErrorId : undefined} required />
                  </>
                )}
                {formError && <p id={formErrorId} className="industrial-message industrial-message-warning" role="alert">{formError}</p>}
                <FormActions align="start" className="person-toolbar compact">
                  <IndustrialButton type="submit">Aktion dokumentieren</IndustrialButton>
                  <IndustrialButton type="button" variant="secondary" onClick={onClose}>Abbrechen</IndustrialButton>
                </FormActions>
              </form>
            )}
        </IndustrialModal>
      )}
    </section>
  );
}
