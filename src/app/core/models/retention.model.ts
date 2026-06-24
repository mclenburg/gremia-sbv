export type RetentionCandidateType =
  | 'closed_case_review'
  | 'stale_case_review'
  | 'orphan_contact_review'
  | 'orphan_document_review'
  | 'free_deadline_review'
  | 'journal_entry_review_due'
  | 'journal_entry_deferred_open_follow_up'
  | 'journal_entry_linked_to_active_case'
  | 'journal_entry_exported_review_required'
  | 'participation_violation_open_review'
  | 'participation_violation_closed_review'
  | 'participation_violation_document_integrity'
  | 'cleartext_file_review';

export type RetentionRiskLevel = 'info' | 'warning' | 'critical';

export interface RetentionSettings {
  closedCaseReviewMonths: number;
  inactiveOpenCaseMonths: number;
  orphanContactReviewDays: number;
  completedDeadlineRetentionMonths: number;
  activityJournalReviewMonths: number;
  participationViolationReviewMonths: number;
  minimumGroupSizeForReports: number;
}

export interface RetentionCandidate {
  id: string;
  type: RetentionCandidateType;
  riskLevel: RetentionRiskLevel;
  title: string;
  reference?: string;
  description: string;
  recommendedAction: 'pruefen' | 'anonymisieren' | 'loeschen' | 'archivieren';
  createdAt?: string;
  dueSince?: string;
  entityType: 'case' | 'contact' | 'document' | 'deadline' | 'activity_journal_entry' | 'sbv_participation_violation' | 'file' | 'system';
  entityId?: string;
}

export interface RetentionDashboard {
  generatedAt: string;
  settings: RetentionSettings;
  candidates: RetentionCandidate[];
  counts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export interface RetentionOperationResult {
  ok: boolean;
  action: 'case_anonymized' | 'case_deleted' | 'document_deleted' | 'contact_anonymized' | 'none';
  message?: string;
  error?: string;
  affectedRows?: number;
  affectedFiles?: number;
}

export interface UpdateRetentionSettingsInput {
  closedCaseReviewMonths?: number;
  inactiveOpenCaseMonths?: number;
  orphanContactReviewDays?: number;
  completedDeadlineRetentionMonths?: number;
  activityJournalReviewMonths?: number;
  participationViolationReviewMonths?: number;
  minimumGroupSizeForReports?: number;
}
