import type { RetentionOwnerType } from './retention-owner.model.js';

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
  | 'cleartext_file_review'
  | 'office_workflow_review_due'
  | 'module_retention_review_due'
  | 'immediate_purpose_expiry_review';

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
  entityType: RetentionOwnerType | RetentionModuleType | 'contact' | 'document' | 'deadline' | 'activity_journal_entry' | 'sbv_participation_violation' | 'file' | 'system';
  entityId?: string;
  privacyReviewRequired?: boolean;
  policyKey?: RetentionModuleType;
  legalBasis?: string;
}

export type RetentionModuleType =
  | 'recruiting'
  | 'termination_hearing'
  | 'bem'
  | 'prevention'
  | 'sbv_participation'
  | 'case_file'
  | 'activity_journal'
  | 'protected_person'
  | 'election'
  | 'workplace_accommodation'
  | 'equalization_gdb'
  | 'compliance_incident';

export type RetentionRule =
  | { kind: 'months_after_completion'; months: number }
  | { kind: 'months_after_completion_year_end'; months: number }
  | { kind: 'term_related'; months: number }
  | { kind: 'purpose_linked' }
  | { kind: 'permanent_anonymized' };

export interface RetentionPolicyDefinition {
  module: RetentionModuleType;
  label: string;
  rule: RetentionRule;
  legalBasis: string;
  explanation: string;
  immediateOnConsentWithdrawal?: boolean;
}

export interface RetentionModuleSnapshot {
  module: RetentionModuleType;
  id: string;
  title: string;
  status?: string;
  completedAt?: string | null;
  consentWithdrawnAt?: string | null;
  purposeStillActive?: boolean;
}

export interface RetentionDashboard {
  generatedAt: string;
  settings: RetentionSettings;
  policies: RetentionPolicyDefinition[];
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
