import type { CaseStatus } from '../src/app/core/models/case.model.js';
import type { EmploymentState, ProtectionStatus } from '../src/app/core/models/protected-person.model.js';
import type { PrivacyReviewPriority } from './personCaseBindingPolicy.js';

export type PrivacyReviewLifecycleEvent =
  | { type: 'status_expiring_soon'; referenceDate: string }
  | { type: 'status_expired'; referenceDate: string }
  | { type: 'status_renewed'; validUntil?: string | null }
  | { type: 'employment_ended'; leftCompanyAt: string }
  | { type: 'retention_reason_documented'; reason: string; reviewAt: string }
  | { type: 'privacy_review_cleared'; clearedAt: string }
  | { type: 'anonymization_confirmed'; reason: string }
  | { type: 'deletion_confirmed'; reason: string };

export type PrivacyReviewReason =
  | 'status_expired'
  | 'employment_ended'
  | 'linked_person_anonymized'
  | 'linked_person_deleted'
  | 'legacy_unlinked'
  | 'multiple_person_links'
  | 'no_person_link'
  | 'retention_due';

export interface PrivacyReviewContext {
  protectionStatus?: ProtectionStatus;
  statusValidUntil?: string | null;
  employmentState?: EmploymentState;
  leftCompanyAt?: string | null;
  caseStatus?: CaseStatus | string;
  openDeadlineCount?: number;
  runningMeasureCount?: number;
  linkedDocumentCount?: number;
  lastActivityAt?: string | null;
  freeTextReviewRequired?: boolean;
}

export interface PrivacyReviewDecision {
  required: boolean;
  reason?: PrivacyReviewReason;
  priority: PrivacyReviewPriority;
  dueAt?: string;
  freeTextReviewRequired: boolean;
}

export function decidePrivacyReviewForContext(context: PrivacyReviewContext, referenceDate = new Date()): PrivacyReviewDecision {
  const hasOpenDeadlines = (context.openDeadlineCount ?? 0) > 0;
  const hasRunningMeasures = (context.runningMeasureCount ?? 0) > 0;
  const priority: PrivacyReviewPriority = hasOpenDeadlines ? 'critical' : hasRunningMeasures ? 'high' : context.caseStatus === 'abgeschlossen' ? 'low' : 'normal';

  if (context.employmentState === 'left_company') {
    return { required: true, reason: 'employment_ended', priority, dueAt: referenceDate.toISOString(), freeTextReviewRequired: true };
  }
  if (context.protectionStatus === 'expired') {
    return { required: true, reason: 'status_expired', priority, dueAt: referenceDate.toISOString(), freeTextReviewRequired: true };
  }
  return { required: false, priority, freeTextReviewRequired: Boolean(context.freeTextReviewRequired) };
}

export function assertRetentionDecision(reason: string | undefined, reviewAt: string | undefined): void {
  if (!reason?.trim()) throw new Error('Fortspeicherung benötigt einen dokumentierten Grund.');
  if (!reviewAt?.trim()) throw new Error('Fortspeicherung benötigt einen erneuten Prüftermin.');
  if (Number.isNaN(new Date(reviewAt).getTime())) throw new Error('Der Prüftermin für die Fortspeicherung ist kein gültiges Datum.');
}


export interface LegacyBulkReviewCandidateContext {
  status?: CaseStatus | string;
  personBindingState?: string | null;
  hasOpenDeadlines?: boolean;
  closedAt?: string | null;
}

export interface LegacyBulkReviewDecision {
  eligible: boolean;
  reason?: 'closed_legacy_no_open_deadlines';
  priority: PrivacyReviewPriority;
  anonymizationRecommended: boolean;
}

export function decideLegacyBulkPrivacyReview(context: LegacyBulkReviewCandidateContext): LegacyBulkReviewDecision {
  const isClosedLegacy = context.status === 'abgeschlossen' && context.personBindingState === 'legacy_unlinked';
  if (!isClosedLegacy || context.hasOpenDeadlines) {
    return { eligible: false, priority: context.hasOpenDeadlines ? 'critical' : 'normal', anonymizationRecommended: false };
  }
  return { eligible: true, reason: 'closed_legacy_no_open_deadlines', priority: 'low', anonymizationRecommended: true };
}

export function assertDestructivePrivacyConfirmation(action: 'anonymize' | 'delete', confirmation: string | undefined): void {
  const expected = action === 'anonymize' ? 'FALL ANONYMISIEREN' : 'FALL LÖSCHEN';
  if (confirmation !== expected) throw new Error(`Bitte exakt „${expected}“ eingeben.`);
}
