import type { CreateRecruitingInterviewEventInput, CreateRecruitingParticipationInput, RecruitingAccessibilityCheckStatus, RecruitingApplicantReferenceMode, RecruitingApplicantStatus, RecruitingParticipationRecord, RecruitingParticipationStatus, RecruitingViolationReviewReason, UpdateRecruitingParticipationInput } from '../../core/models/recruiting-participation.model';
import { recruitingAccessibilityStatusLabels, recruitingApplicantReferenceModeLabels, recruitingApplicantStatusLabels, recruitingStatusLabels, recruitingViolationReviewReasonLabels } from './recruitingViewLogic';
export type ParticipationFormState = {
  vacancyTitle: string;
  vacancyReference: string;
  department: string;
  location: string;
  status: RecruitingParticipationStatus;
  employerNoticeDate: string;
  documentsReceivedDate: string;
  documentsComplete: boolean;
  hasSeverelyDisabledApplicants: boolean;
  severelyDisabledApplicantCount: string;
  sbvInvitedToAllKnownInterviews: boolean;
  sbvParticipated: boolean;
  hearingRequestedDate: string;
  hearingDueDate: string;
  statementSubmittedDate: string;
  decisionKnownDate: string;
  decisionBeforeHearing: boolean;
  brProcedureDate: string;
  flaggedForViolationReview: boolean;
  violationReviewReason: RecruitingViolationReviewReason;
  notes: string;
};

export type InterviewFormState = {
  interviewDate: string;
  applicantRef: string;
  applicantReferenceMode: RecruitingApplicantReferenceMode;
  applicantStatus: RecruitingApplicantStatus;
  sbvInvited: boolean;
  sbvInvitationDate: string;
  sbvAttended: boolean;
  accessibilityCheckStatus: RecruitingAccessibilityCheckStatus;
  followUpNeeded: boolean;
  proceduralNote: string;
};

export const statusOptions = Object.entries(recruitingStatusLabels).map(([value, label]) => ({ value, label }));
export const applicantStatusOptions = Object.entries(recruitingApplicantStatusLabels).map(([value, label]) => ({ value, label }));
export const applicantReferenceModeOptions = Object.entries(recruitingApplicantReferenceModeLabels).map(([value, label]) => ({ value, label }));
export const accessibilityOptions = Object.entries(recruitingAccessibilityStatusLabels).map(([value, label]) => ({ value, label }));
export const violationReasonOptions = Object.entries(recruitingViolationReviewReasonLabels).map(([value, label]) => ({ value, label }));

export function toDateInput(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function fromDateInput(value: string): string | undefined {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;
}

export function emptyParticipationForm(): ParticipationFormState {
  return {
    vacancyTitle: '',
    vacancyReference: '',
    department: '',
    location: '',
    status: 'draft',
    employerNoticeDate: '',
    documentsReceivedDate: '',
    documentsComplete: false,
    hasSeverelyDisabledApplicants: true,
    severelyDisabledApplicantCount: '',
    sbvInvitedToAllKnownInterviews: false,
    sbvParticipated: false,
    hearingRequestedDate: '',
    hearingDueDate: '',
    statementSubmittedDate: '',
    decisionKnownDate: '',
    decisionBeforeHearing: false,
    brProcedureDate: '',
    flaggedForViolationReview: false,
    violationReviewReason: 'manual_review',
    notes: '',
  };
}

export function formFromRecord(record: RecruitingParticipationRecord): ParticipationFormState {
  return {
    vacancyTitle: record.vacancyTitle,
    vacancyReference: record.vacancyReference ?? '',
    department: record.department ?? '',
    location: record.location ?? '',
    status: record.status,
    employerNoticeDate: toDateInput(record.employerNoticeDate),
    documentsReceivedDate: toDateInput(record.documentsReceivedDate),
    documentsComplete: record.documentsComplete,
    hasSeverelyDisabledApplicants: record.hasSeverelyDisabledApplicants,
    severelyDisabledApplicantCount: record.severelyDisabledApplicantCount === undefined ? '' : String(record.severelyDisabledApplicantCount),
    sbvInvitedToAllKnownInterviews: Boolean(record.sbvInvitedToAllKnownInterviews),
    sbvParticipated: Boolean(record.sbvParticipated),
    hearingRequestedDate: toDateInput(record.hearingRequestedDate),
    hearingDueDate: toDateInput(record.hearingDueDate),
    statementSubmittedDate: toDateInput(record.statementSubmittedDate),
    decisionKnownDate: toDateInput(record.decisionKnownDate),
    decisionBeforeHearing: record.decisionBeforeHearing,
    brProcedureDate: toDateInput(record.brProcedureDate),
    flaggedForViolationReview: record.flaggedForViolationReview,
    violationReviewReason: record.violationReviewReason ?? 'manual_review',
    notes: record.notes ?? '',
  };
}

export function inputFromForm(form: ParticipationFormState): CreateRecruitingParticipationInput | UpdateRecruitingParticipationInput {
  return {
    vacancyTitle: form.vacancyTitle.trim(),
    vacancyReference: form.vacancyReference.trim() || undefined,
    department: form.department.trim() || undefined,
    location: form.location.trim() || undefined,
    status: form.status,
    employerNoticeDate: fromDateInput(form.employerNoticeDate),
    documentsReceivedDate: fromDateInput(form.documentsReceivedDate),
    documentsComplete: form.documentsComplete,
    hasSeverelyDisabledApplicants: form.hasSeverelyDisabledApplicants,
    severelyDisabledApplicantCount: form.severelyDisabledApplicantCount.trim() ? Number(form.severelyDisabledApplicantCount) : undefined,
    sbvInvitedToAllKnownInterviews: form.sbvInvitedToAllKnownInterviews,
    sbvParticipated: form.sbvParticipated,
    hearingRequestedDate: fromDateInput(form.hearingRequestedDate),
    hearingDueDate: fromDateInput(form.hearingDueDate),
    statementSubmittedDate: fromDateInput(form.statementSubmittedDate),
    decisionKnownDate: fromDateInput(form.decisionKnownDate),
    decisionBeforeHearing: form.decisionBeforeHearing,
    brProcedureDate: fromDateInput(form.brProcedureDate),
    flaggedForViolationReview: form.flaggedForViolationReview,
    violationReviewReason: form.flaggedForViolationReview ? form.violationReviewReason : undefined,
    notes: form.notes.trim() || undefined,
  };
}

export function emptyInterviewForm(): InterviewFormState {
  return {
    interviewDate: new Date().toISOString().slice(0, 10),
    applicantRef: '',
    applicantReferenceMode: 'anonymous_reference',
    applicantStatus: 'severely_disabled',
    sbvInvited: true,
    sbvInvitationDate: '',
    sbvAttended: false,
    accessibilityCheckStatus: 'not_checked',
    followUpNeeded: false,
    proceduralNote: '',
  };
}

export function interviewInputFromForm(recruitingParticipationId: string, form: InterviewFormState): CreateRecruitingInterviewEventInput {
  return {
    recruitingParticipationId,
    interviewDate: fromDateInput(form.interviewDate) ?? new Date().toISOString(),
    applicantRef: form.applicantRef.trim() || undefined,
    applicantReferenceMode: form.applicantReferenceMode,
    applicantStatus: form.applicantStatus,
    sbvInvited: form.sbvInvited,
    sbvInvitationDate: fromDateInput(form.sbvInvitationDate),
    sbvAttended: form.sbvAttended,
    accessibilityCheckStatus: form.accessibilityCheckStatus,
    followUpNeeded: form.followUpNeeded,
    proceduralNote: form.proceduralNote.trim() || undefined,
  };
}

