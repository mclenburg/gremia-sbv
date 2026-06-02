import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HelpCircle } from 'lucide-react';
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewItemRecord } from '../../core/models/privacy-review.model';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';
import { AUDIT_LOG_RETENTION_NOTICE } from '../../core/copy/privacyNotices';

const reasonLabels: Record<string, string> = {
  status_expired: 'Status abgelaufen',
  employment_ended: 'Beschäftigung beendet',
  linked_person_anonymized: 'Person anonymisiert',
  linked_person_deleted: 'Person gelöscht',
  legacy_unlinked: 'Altfall ohne sicheren Personenbezug',
  multiple_person_links: 'Mehrere aktive Personenbezüge',
  no_person_link: 'Kein Personenbezug',
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
      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
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
  onAnonymizeCase: (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>) => Promise<PrivacyReviewActionResult>;
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
  const [action, setAction] = useState<'retention' | 'later' | 'clear' | 'anonymize' | 'delete'>('retention');
  const [reason, setReason] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = `privacy-review-title-${person.id}`;
  const dialogDescriptionId = `privacy-review-description-${person.id}`;
  const formErrorId = `privacy-review-error-${person.id}`;
  const [formError, setFormError] = useState('');

  const requiresReview = reviews.length > 0 || ['expired_review_required', 'anonymization_pending', 'retention_documented'].includes(person.lifecycleState);
  const selectedReview = reviews.find((review) => review.caseId === selectedCaseId) ?? reviews[0];

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
      else if (action === 'anonymize') result = await onAnonymizeCase({ caseId, reason, confirmation });
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
        <div className="industrial-modal-backdrop" role="presentation">
          <section
            className="industrial-modal person-privacy-review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescriptionId}
            data-e2e="privacy-review-dialog"
          >
            <div className="industrial-panel-heading">
              <div>
                <p className="industrial-kicker">Datenschutz-Lifecycle</p>
                <h2 id={dialogTitleId}>Prüfung bei Zweckfortfall</h2>
              </div>
              <button type="button" className="industrial-secondary-button" ref={closeButtonRef} onClick={onClose}>Schließen</button>
            </div>
            <div id={dialogDescriptionId} className="industrial-muted person-lifecycle-review-summary">
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
                <label>
                  <span>Prüfpflichtige Fallakte</span>
                  <select value={selectedReview?.caseId ?? ''} onChange={(event) => setSelectedCaseId(event.target.value)}>
                    {reviews.map((review) => (
                      <option key={review.id} value={review.caseId}>
                        {review.context.caseFile?.caseNumber ?? review.caseId} · {reasonLabels[review.reason] ?? review.reason} · Priorität {priorityLabels[review.priority] ?? review.priority}
                      </option>
                    ))}
                  </select>
                </label>

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
                  <select value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
                    <option value="retention">Fortspeicherung begründen</option>
                    <option value="later">später erneut prüfen</option>
                    <option value="clear">Prüfung abschließen / Status aktualisiert</option>
                    <option value="anonymize">Fallakte anonymisieren</option>
                    <option value="delete">Fallakte löschen</option>
                  </select>
                </label>
                <label>
                  <span>Grund / Prüfbemerkung</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} aria-describedby={formError ? formErrorId : undefined} required />
                </label>
                {(action === 'retention' || action === 'later') && (
                  <label>
                    <span>Erneut prüfen am</span>
                    <input type="date" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} aria-describedby={formError ? formErrorId : undefined} required />
                  </label>
                )}
                {(action === 'anonymize' || action === 'delete') && (
                  <>
                    <p className="industrial-message industrial-message-info" data-e2e="audit-log-retention-notice">
                      {AUDIT_LOG_RETENTION_NOTICE}
                    </p>
                    <label>
                      <span>Bestätigung</span>
                      <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={action === 'anonymize' ? 'FALL ANONYMISIEREN' : 'FALL LÖSCHEN'} aria-describedby={formError ? formErrorId : undefined} required />
                    </label>
                  </>
                )}
                {formError && <p id={formErrorId} className="industrial-message industrial-message-warning" role="alert">{formError}</p>}
                <div className="person-toolbar compact">
                  <button type="submit" className="industrial-button">Aktion dokumentieren</button>
                  <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
