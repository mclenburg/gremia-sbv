import type { CaseRecord } from '../../core/models/case.model';
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewItemRecord } from '../../core/models/privacy-review.model';
import type { ProtectedPersonRecord, UpdateProtectedPersonInput } from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { StatusBadge } from '../../shared/components/StatusBadges';
import { toInputDate } from './personImportUi';
import { PersonLifecycleReviewDialog } from './PersonLifecycleReviewDialog';

export function PersonDetail({
  person,
  cases,
  onUpdate,
  onOpenCaseCreate,
  onOpenAnonymize,
  privacyReviewOpen,
  privacyReviews,
  privacyReviewLoading,
  onOpenPrivacyReview,
  onClosePrivacyReview,
  onDocumentRetention,
  onScheduleLater,
  onClearReview,
  onAnonymizeCase,
  onDeleteCase,
  onMessage,
  onError
}: {
  person: ProtectedPersonRecord | null;
  cases: CaseRecord[];
  onUpdate: (id: string, input: UpdateProtectedPersonInput) => Promise<void>;
  onOpenCaseCreate: () => void;
  onOpenAnonymize: () => void;
  privacyReviewOpen: boolean;
  privacyReviews: PrivacyReviewItemRecord[];
  privacyReviewLoading: boolean;
  onOpenPrivacyReview: () => Promise<void>;
  onClosePrivacyReview: () => void;
  onDocumentRetention: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onScheduleLater: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onClearReview: (input: PrivacyReviewActionInput) => Promise<PrivacyReviewActionResult>;
  onAnonymizeCase: (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>) => Promise<PrivacyReviewActionResult>;
  onDeleteCase: (input: Required<Pick<PrivacyReviewActionInput, 'caseId' | 'reason' | 'confirmation'>>) => Promise<PrivacyReviewActionResult>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  if (!person) return <section className="industrial-panel person-detail-empty" aria-label="Keine Person ausgewählt"><p className="industrial-muted">Wählen Sie links eine Person aus, um Status, Beschäftigung und Datenschutz-Lifecycle zu prüfen.</p></section>;

  async function updateSelected(input: UpdateProtectedPersonInput) { await onUpdate(person!.id, input); }
  const displayName = person.recordKind === 'pseudonymous_request' ? person.pseudonymLabel || 'Anonyme Anfrage' : `${person.lastName}, ${person.firstName}`;
  const linkedCaseCount = cases.filter((record) => record.protectedPersonId === person.id).length;

  return (
    <section className="industrial-panel person-detail" aria-labelledby="person-detail-heading">
      <div className="person-detail-header">
        <div>
          <p className="industrial-kicker">Detail</p>
          <h2 id="person-detail-heading">{displayName}</h2>
        </div>
        <div className="person-detail-actions">
          <ToolbarButton data-e2e="create-case-from-selected-person" onClick={onOpenCaseCreate}>Fallakte anlegen</ToolbarButton>
          <ToolbarButton disabled={person.lifecycleState === 'anonymized'} data-e2e="open-person-anonymize-dialog" onClick={onOpenAnonymize}>Person anonymisieren</ToolbarButton>
        </div>
      </div>

      <section className="person-lifecycle-card industrial-message" aria-label="Datenschutz-Lifecycle der ausgewählten Person">
        <div>
          <strong>Schutzstatus und Zweckbindung prüfen</strong>
          <span>Die Personenansicht führt Schutzstatus, Beschäftigungsstatus und Datenschutz-Lifecycle zusammen. Gesundheitsdetails gehören nur in zweckgebundene Fallnotizen.</span>
        </div>
        <div className="case-overview-badges" aria-label="Personenstatus">
          <StatusBadge label={protectionStatusLabels[person.protectionStatus]} tone={person.protectionStatus === 'expired' || person.protectionStatus === 'inactive' ? 'warning' : 'success'} />
          <StatusBadge label={lifecycleStateLabels[person.lifecycleState]} tone={person.lifecycleState === 'expired_review_required' || person.lifecycleState === 'anonymization_pending' ? 'danger' : person.lifecycleState === 'expiring_soon' || person.lifecycleState === 'retention_documented' ? 'warning' : 'default'} />
          <StatusBadge label={person.recordKind === 'pseudonymous_request' ? 'pseudonym' : 'identifiziert'} tone={person.recordKind === 'pseudonymous_request' ? 'info' : 'default'} />
        </div>
      </section>
      <dl className="person-detail-grid">
        <div><dt>Schutzstatus</dt><dd>{protectionStatusLabels[person.protectionStatus]}</dd></div>
        <div><dt>Beschäftigung</dt><dd>{employmentStateLabels[person.employmentState]}</dd></div>
        <div><dt>Lifecycle</dt><dd>{lifecycleStateLabels[person.lifecycleState]}</dd></div>
        <div><dt>Status gültig bis</dt><dd>{person.statusValidUntil ?? '—'}</dd></div>
        <div><dt>Beschäftigungsende</dt><dd>{person.leftCompanyAt ?? '—'}</dd></div>
        <div><dt>Dienstliche E-Mail</dt><dd>{person.workEmail ?? '—'}</dd></div>
        <div><dt>Personalnummer</dt><dd>{person.personnelNumber ?? '—'}</dd></div>
        <div><dt>Organisationseinheit</dt><dd>{person.organizationalUnit ?? '—'}</dd></div>
        <div><dt>Standort</dt><dd>{person.location ?? '—'}</dd></div>
      </dl>
      <PersonLifecycleReviewDialog person={person} open={privacyReviewOpen} reviews={privacyReviews} loading={privacyReviewLoading} onOpen={onOpenPrivacyReview} onClose={onClosePrivacyReview} onDocumentRetention={onDocumentRetention} onScheduleLater={onScheduleLater} onClear={onClearReview} onAnonymizeCase={onAnonymizeCase} onDeleteCase={onDeleteCase} onMessage={onMessage} onError={onError} />
      <div className="industrial-settings-form">
        <label><span>Status gültig bis</span><input type="date" defaultValue={toInputDate(person.statusValidUntil)} onBlur={(event) => void updateSelected({ statusValidUntil: event.target.value || undefined, protectionStatus: event.target.value ? person.protectionStatus : 'expired' })} /></label>
        <label><span>Beschäftigungsende</span><input type="date" defaultValue={toInputDate(person.leftCompanyAt)} onBlur={(event) => { const value = event.target.value; const today = new Date().toISOString().slice(0, 10); void updateSelected({ employmentState: value && value <= today ? 'left_company' : 'active_employee', leftCompanyAt: value || undefined }); }} /></label>
      </div>
      <p className="industrial-muted">Verknüpfte Fallakten werden bei einer Anonymisierung nicht mehr mit Namen angezeigt, sondern erhalten eine Datenschutz-Prüfmarkierung.</p>
      <p className="industrial-meta">Verknüpfte Fallakten: {linkedCaseCount}</p>
    </section>
  );
}
