export type CaseStatus = 'offen' | 'in_bearbeitung' | 'ruhend' | 'abgeschlossen';
export type CasePriority = 'normal' | 'wichtig' | 'kritisch';

export type PersonBindingState =
  | 'active'
  | 'migrated'
  | 'legacy_unlinked'
  | 'anonymous_request'
  | 'anonymized'
  | 'person_deleted'
  | 'unlinking_in_progress';

export type CaseCategory =
  | 'bem'
  | 'praevention'
  | 'kuendigung'
  | 'gleichstellung'
  | 'gdb'
  | 'nachteilsausgleich'
  | 'diskriminierung'
  | 'arbeitsplatzgestaltung'
  | 'teilzeit'
  | 'sonstiges';

export interface CaseRecord {
  id: string;
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  status: CaseStatus;
  priority: CasePriority;
  openedAt: string;
  closedAt?: string;
  summary?: string;
  isPseudonymized: boolean;
  isLocked: boolean;
  protectedPersonId?: string;
  /** Optional for compatibility with legacy test fixtures and records before schema 0025; persisted records are normalized by CaseService. */
  personBindingState?: PersonBindingState;
  privacyReviewRequired?: boolean;
  privacyReviewReason?: string;
  privacyReviewDueAt?: string;
  privacyReviewPriority?: 'critical' | 'high' | 'normal' | 'low';
  anonymizationRecommended?: boolean;
  anonymizedAt?: string;
  handoverImportId?: string;
  handoverPackageId?: string;
  handoverValidUntil?: string;
  handoverStatus?: 'none' | 'active' | 'expired' | 'continued_after_expiry' | 'closed';
  handoverContinueConfirmedAt?: string;
  handoverContinueReason?: string;
}


export interface LegacyCaseBindingInput {
  caseId: string;
  protectedPersonId: string;
  reason: string;
}

export interface LegacyCaseBindingResult {
  caseId: string;
  protectedPersonId: string;
  personBindingState: PersonBindingState;
  privacyReviewRequired: boolean;
}

export interface CreateCaseInput {
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  summary?: string;
  priority?: CasePriority;
  isPseudonymized?: boolean;
  protectedPersonId?: string;
  personBindingState?: PersonBindingState;
}

