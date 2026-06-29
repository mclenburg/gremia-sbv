export const RECRUITING_PARTICIPATION_STATUSES = [
  'draft',
  'notice_received',
  'interviews_scheduled',
  'interviews_completed',
  'hearing_pending',
  'statement_submitted',
  'decision_known',
  'closed',
] as const;

export const RECRUITING_APPLICANT_REFERENCE_MODES = [
  'anonymous_reference',
  'pseudonymized_reference',
  'clear_name',
] as const;

export const RECRUITING_ACCESSIBILITY_CHECK_STATUSES = [
  'not_checked',
  'not_relevant',
  'contact_offered',
  'format_checked',
  'follow_up_needed',
] as const;

export const RECRUITING_APPLICANT_STATUSES = [
  'severely_disabled',
  'equal_status',
  'unknown_or_not_relevant',
] as const;

export const RECRUITING_VIOLATION_REVIEW_REASONS = [
  'decision_before_hearing',
  'missing_hearing_after_interview',
  'incomplete_information',
  'sbv_not_invited',
  'execution_without_remedy',
  'manual_review',
] as const;

export type RecruitingParticipationStatus = typeof RECRUITING_PARTICIPATION_STATUSES[number];
export type RecruitingApplicantReferenceMode = typeof RECRUITING_APPLICANT_REFERENCE_MODES[number];
export type RecruitingAccessibilityCheckStatus = typeof RECRUITING_ACCESSIBILITY_CHECK_STATUSES[number];
export type RecruitingApplicantStatus = typeof RECRUITING_APPLICANT_STATUSES[number];
export type RecruitingViolationReviewReason = typeof RECRUITING_VIOLATION_REVIEW_REASONS[number];

export interface RecruitingParticipationRecord {
  id: string;
  vacancyTitle: string;
  vacancyReference?: string;
  department?: string;
  location?: string;
  status: RecruitingParticipationStatus;
  employerNoticeDate?: string;
  documentsReceivedDate?: string;
  documentsComplete: boolean;
  hasSeverelyDisabledApplicants: boolean;
  severelyDisabledApplicantCount?: number;
  interviewCount: number;
  sbvInvitedToAllKnownInterviews?: boolean;
  sbvParticipated?: boolean;
  hearingRequestedDate?: string;
  hearingDueDate?: string;
  statementSubmittedDate?: string;
  decisionKnownDate?: string;
  decisionBeforeHearing: boolean;
  brProcedureDate?: string;
  flaggedForViolationReview: boolean;
  violationReviewReason?: RecruitingViolationReviewReason;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecruitingInterviewEventRecord {
  id: string;
  recruitingParticipationId: string;
  interviewDate: string;
  applicantRef: string;
  applicantReferenceMode: RecruitingApplicantReferenceMode;
  applicantStatus: RecruitingApplicantStatus;
  sbvInvited: boolean;
  sbvInvitationDate?: string;
  sbvAttended: boolean;
  accessibilityCheckStatus: RecruitingAccessibilityCheckStatus;
  followUpNeeded: boolean;
  proceduralNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecruitingParticipationInput {
  vacancyTitle: string;
  vacancyReference?: string;
  department?: string;
  location?: string;
  status?: RecruitingParticipationStatus;
  employerNoticeDate?: string;
  documentsReceivedDate?: string;
  documentsComplete?: boolean;
  hasSeverelyDisabledApplicants?: boolean;
  severelyDisabledApplicantCount?: number;
  sbvInvitedToAllKnownInterviews?: boolean;
  sbvParticipated?: boolean;
  hearingRequestedDate?: string;
  hearingDueDate?: string;
  statementSubmittedDate?: string;
  decisionKnownDate?: string;
  decisionBeforeHearing?: boolean;
  brProcedureDate?: string;
  flaggedForViolationReview?: boolean;
  violationReviewReason?: RecruitingViolationReviewReason;
  notes?: string;
}

export type UpdateRecruitingParticipationInput = Partial<CreateRecruitingParticipationInput>;

export interface CreateRecruitingInterviewEventInput {
  recruitingParticipationId: string;
  interviewDate: string;
  applicantRef?: string;
  applicantReferenceMode?: RecruitingApplicantReferenceMode;
  applicantStatus?: RecruitingApplicantStatus;
  sbvInvited?: boolean;
  sbvInvitationDate?: string;
  sbvAttended?: boolean;
  accessibilityCheckStatus?: RecruitingAccessibilityCheckStatus;
  followUpNeeded?: boolean;
  proceduralNote?: string;
}

export type UpdateRecruitingInterviewEventInput = Partial<Omit<CreateRecruitingInterviewEventInput, 'recruitingParticipationId'>>;
