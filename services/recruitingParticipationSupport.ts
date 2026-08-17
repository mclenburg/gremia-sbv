import type { RecruitingInterviewEventRecord, RecruitingParticipationRecord, RecruitingViolationReviewReason } from '../src/domain/models/recruiting-participation.model.js';
import { normalizeOptionalBoolean } from './recruitingParticipationValidation.js';
export interface RecruitingParticipationRow {
  id: string; vacancy_title: string; vacancy_reference: string | null; department: string | null; location: string | null;
  status: RecruitingParticipationRecord['status']; employer_notice_date: string | null; documents_received_date: string | null;
  documents_complete: number; has_severely_disabled_applicants: number; severely_disabled_applicant_count: number | null;
  interview_count: number | null; sbv_invited_to_all_known_interviews: number | null; sbv_participated: number | null;
  hearing_requested_date: string | null; hearing_due_date: string | null; statement_submitted_date: string | null;
  decision_known_date: string | null; decision_before_hearing: number; br_procedure_date: string | null;
  flagged_for_violation_review: number; violation_review_reason: string | null; notes: string | null; created_at: string; updated_at: string;
}
export interface RecruitingInterviewRow {
  id: string; recruiting_participation_id: string; interview_date: string; applicant_ref: string;
  applicant_reference_mode: RecruitingInterviewEventRecord['applicantReferenceMode']; applicant_status: RecruitingInterviewEventRecord['applicantStatus'];
  sbv_invited: number; sbv_invitation_date: string | null; sbv_attended: number;
  accessibility_check_status: RecruitingInterviewEventRecord['accessibilityCheckStatus']; follow_up_needed: number;
  procedural_note: string | null; created_at: string; updated_at: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function bool(value: unknown): boolean {
  return Boolean(value);
}

export function undefinedIfNull<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

export function sqliteOptionalBoolean(value: unknown): 0 | 1 | null {
  const normalized = normalizeOptionalBoolean(value);
  if (normalized === null) return null;
  return normalized ? 1 : 0;
}

export function mapParticipation(row: RecruitingParticipationRow): RecruitingParticipationRecord {
  return {
    id: row.id,
    vacancyTitle: row.vacancy_title,
    vacancyReference: undefinedIfNull(row.vacancy_reference),
    department: undefinedIfNull(row.department),
    location: undefinedIfNull(row.location),
    status: row.status,
    employerNoticeDate: undefinedIfNull(row.employer_notice_date),
    documentsReceivedDate: undefinedIfNull(row.documents_received_date),
    documentsComplete: bool(row.documents_complete),
    hasSeverelyDisabledApplicants: bool(row.has_severely_disabled_applicants),
    severelyDisabledApplicantCount: row.severely_disabled_applicant_count === null || row.severely_disabled_applicant_count === undefined ? undefined : Number(row.severely_disabled_applicant_count),
    interviewCount: Number(row.interview_count ?? 0),
    sbvInvitedToAllKnownInterviews: row.sbv_invited_to_all_known_interviews === null || row.sbv_invited_to_all_known_interviews === undefined ? undefined : bool(row.sbv_invited_to_all_known_interviews),
    sbvParticipated: row.sbv_participated === null || row.sbv_participated === undefined ? undefined : bool(row.sbv_participated),
    hearingRequestedDate: undefinedIfNull(row.hearing_requested_date),
    hearingDueDate: undefinedIfNull(row.hearing_due_date),
    statementSubmittedDate: undefinedIfNull(row.statement_submitted_date),
    decisionKnownDate: undefinedIfNull(row.decision_known_date),
    decisionBeforeHearing: bool(row.decision_before_hearing),
    brProcedureDate: undefinedIfNull(row.br_procedure_date),
    flaggedForViolationReview: bool(row.flagged_for_violation_review),
    violationReviewReason: undefinedIfNull(row.violation_review_reason) as RecruitingViolationReviewReason | undefined,
    notes: undefinedIfNull(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInterview(row: RecruitingInterviewRow): RecruitingInterviewEventRecord {
  return {
    id: row.id,
    recruitingParticipationId: row.recruiting_participation_id,
    interviewDate: row.interview_date,
    applicantRef: row.applicant_ref,
    applicantReferenceMode: row.applicant_reference_mode,
    applicantStatus: row.applicant_status,
    sbvInvited: bool(row.sbv_invited),
    sbvInvitationDate: undefinedIfNull(row.sbv_invitation_date),
    sbvAttended: bool(row.sbv_attended),
    accessibilityCheckStatus: row.accessibility_check_status,
    followUpNeeded: bool(row.follow_up_needed),
    proceduralNote: undefinedIfNull(row.procedural_note),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
