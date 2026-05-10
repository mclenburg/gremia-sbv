import type { CaseRecord } from './case.model';
import type { ProtectedPersonRecord } from './protected-person.model';

export type PrivacyReviewReason =
  | 'status_expired'
  | 'employment_ended'
  | 'linked_person_anonymized'
  | 'linked_person_deleted'
  | 'legacy_unlinked'
  | 'multiple_person_links'
  | 'no_person_link'
  | 'retention_due';

export type PrivacyReviewPriority = 'critical' | 'high' | 'normal' | 'low';
export type PrivacyReviewItemStatus = 'open' | 'cleared' | 'anonymized' | 'deleted' | 'retention_documented';

export interface PrivacyReviewContextSnapshot {
  person?: ProtectedPersonRecord;
  caseFile?: CaseRecord;
  openDeadlineCount: number;
  runningMeasureCount: number;
  linkedDocumentCount: number;
  lastActivityAt?: string;
  freeTextReviewRequired: boolean;
}

export interface PrivacyReviewItemRecord {
  id: string;
  caseId: string;
  protectedPersonId?: string;
  reason: PrivacyReviewReason;
  priority: PrivacyReviewPriority;
  dueAt: string;
  freeTextReviewRequired: boolean;
  context: PrivacyReviewContextSnapshot;
  status: PrivacyReviewItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyReviewActionInput {
  caseId: string;
  reason: string;
  reviewAt?: string;
  confirmation?: string;
}

export interface PrivacyReviewActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  affectedRows?: number;
  affectedFiles?: number;
}


export interface PrivacyReviewBulkResult {
  ok: boolean;
  message?: string;
  reviewed: number;
  marked: number;
  skipped: number;
}
