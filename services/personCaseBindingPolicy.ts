import type { CaseStatus } from '../src/app/core/models/case.model.js';

export type PersonBindingState =
  | 'active'
  | 'migrated'
  | 'legacy_unlinked'
  | 'anonymous_request'
  | 'anonymized'
  | 'person_deleted'
  | 'unlinking_in_progress';

export type PrivacyReviewPriority = 'critical' | 'high' | 'normal' | 'low';

export interface CaseBindingInput {
  protectedPersonId?: string | null;
  personBindingState?: PersonBindingState | null;
  isAnonymousRequest?: boolean;
}

export interface LegacyCaseMigrationInput {
  activePersonLinkIds: string[];
  status: CaseStatus | string;
  hasOpenDeadlines?: boolean;
  hasRunningMeasures?: boolean;
  closedAt?: string | null;
  referenceDate?: Date;
}

export interface LegacyCaseMigrationDecision {
  protectedPersonId: string | null;
  personBindingState: PersonBindingState;
  privacyReviewRequired: boolean;
  privacyReviewReason?: 'multiple_person_links' | 'no_person_link';
  privacyReviewPriority: PrivacyReviewPriority;
  anonymizationRecommended: boolean;
}

export interface LegacyAssignmentInput {
  caseBindingState?: PersonBindingState | null;
  protectedPersonId?: string | null;
  selectedPersonId?: string | null;
  reason?: string | null;
  activePersonLinkIds?: string[];
}

export function assertCanCreateRegularCase(input: CaseBindingInput): void {
  if (input.isAnonymousRequest) return;
  if (!input.protectedPersonId?.trim()) {
    throw new Error('Neue reguläre Fallakten müssen einer Person zugeordnet werden. Für anonyme Erstberatung bitte den Sonderweg „Anonyme Beratungsanfrage dokumentieren“ nutzen.');
  }
}

export function assertSingleActivePersonBinding(activePersonIds: string[]): void {
  const unique = [...new Set(activePersonIds.filter(Boolean))];
  if (unique.length > 1) throw new Error('Eine Fallakte darf nicht zwei aktiven Personen gehören. Bitte Datenschutzprüfung starten.');
}

export function assertCanAssignLegacyCase(input: LegacyAssignmentInput): void {
  if (input.caseBindingState !== 'legacy_unlinked') {
    throw new Error('Nur prüfpflichtige Legacy-Fallakten können über den Zuordnungsdialog neu gebunden werden.');
  }
  if (!input.selectedPersonId?.trim()) throw new Error('Bitte eine Person für die Legacy-Zuordnung auswählen.');
  if (!input.reason?.trim()) throw new Error('Bitte den Grund der manuellen Legacy-Zuordnung dokumentieren.');
  const activeIds = [...new Set((input.activePersonLinkIds ?? []).filter(Boolean))];
  if (activeIds.length > 1 && activeIds.includes(input.selectedPersonId)) return;
}

function isClosedOldCase(input: LegacyCaseMigrationInput): boolean {
  if (input.status !== 'abgeschlossen' || !input.closedAt) return false;
  const reference = input.referenceDate ?? new Date();
  const closedAt = new Date(input.closedAt);
  if (Number.isNaN(closedAt.getTime())) return false;
  const ageMs = reference.getTime() - closedAt.getTime();
  return ageMs >= 1000 * 60 * 60 * 24 * 365 * 2;
}

export function decideLegacyCaseBindingMigration(input: LegacyCaseMigrationInput): LegacyCaseMigrationDecision {
  const activePersonLinkIds = [...new Set(input.activePersonLinkIds.filter(Boolean))];
  const activeLinkCount = activePersonLinkIds.length;
  const lowPriority = (input.status === 'abgeschlossen' && !input.hasOpenDeadlines && !input.hasRunningMeasures) || isClosedOldCase(input);
  const priority: PrivacyReviewPriority = input.hasOpenDeadlines ? 'critical' : input.hasRunningMeasures ? 'high' : lowPriority ? 'low' : 'normal';

  if (activeLinkCount === 1) {
    return {
      protectedPersonId: activePersonLinkIds[0],
      personBindingState: 'migrated',
      privacyReviewRequired: false,
      privacyReviewPriority: priority,
      anonymizationRecommended: false
    };
  }

  return {
    protectedPersonId: null,
    personBindingState: 'legacy_unlinked',
    privacyReviewRequired: true,
    privacyReviewReason: activeLinkCount > 1 ? 'multiple_person_links' : 'no_person_link',
    privacyReviewPriority: priority,
    anonymizationRecommended: lowPriority
  };
}
