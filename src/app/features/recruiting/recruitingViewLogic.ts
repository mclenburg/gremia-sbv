import type {
  RecruitingAccessibilityCheckStatus,
  RecruitingApplicantReferenceMode,
  RecruitingApplicantStatus,
  RecruitingParticipationRecord,
  RecruitingParticipationStatus,
  RecruitingViolationReviewReason,
} from '../../core/models/recruiting-participation.model';

export const recruitingStatusLabels: Record<RecruitingParticipationStatus, string> = {
  draft: 'Entwurf',
  notice_received: 'Unterrichtung erhalten',
  interviews_scheduled: 'Gespräche geplant',
  interviews_completed: 'Gespräche abgeschlossen',
  hearing_pending: 'Anhörung offen',
  statement_submitted: 'Stellungnahme abgegeben',
  decision_known: 'Entscheidung bekannt',
  closed: 'Abgeschlossen',
};

export const recruitingApplicantStatusLabels: Record<RecruitingApplicantStatus, string> = {
  severely_disabled: 'schwerbehindert',
  equal_status: 'gleichgestellt',
  unknown_or_not_relevant: 'unbekannt / nicht relevant',
};

export const recruitingApplicantReferenceModeLabels: Record<RecruitingApplicantReferenceMode, string> = {
  anonymous_reference: 'anonyme Referenz',
  pseudonymized_reference: 'pseudonymisierte Referenz',
  clear_name: 'Klarname',
};

export const recruitingAccessibilityStatusLabels: Record<RecruitingAccessibilityCheckStatus, string> = {
  not_checked: 'nicht geprüft',
  not_relevant: 'nicht relevant / unbekannt',
  contact_offered: 'Kontakt für Unterstützungsbedarf angeboten',
  format_checked: 'Format / Ort / Technik geprüft',
  follow_up_needed: 'Anpassungsbedarf nachhalten',
};

export const recruitingViolationReviewReasonLabels: Record<RecruitingViolationReviewReason, string> = {
  decision_before_hearing: 'Entscheidung vor Anhörung',
  missing_hearing_after_interview: 'Anhörung nach Gespräch fehlt',
  incomplete_information: 'Unterlagen unvollständig',
  sbv_not_invited: 'SBV nicht eingeladen',
  execution_without_remedy: 'Vollzug ohne Nachholung prüfen',
  manual_review: 'manuell zur Prüfung markiert',
};

export function formatRecruitingDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('de-DE');
}

export function isRecruitingOpen(record: Pick<RecruitingParticipationRecord, 'status'>): boolean {
  return record.status !== 'closed';
}

export function needsHearingBeforeDecision(record: RecruitingParticipationRecord): boolean {
  return record.hasSeverelyDisabledApplicants
    && record.interviewCount > 0
    && !record.statementSubmittedDate
    && !record.decisionKnownDate;
}

export function getRecruitingRiskHints(record: RecruitingParticipationRecord): string[] {
  const hints: string[] = [];
  if (record.hasSeverelyDisabledApplicants && !record.documentsComplete) hints.push('Unterlagen unvollständig');
  if (record.hasSeverelyDisabledApplicants && record.interviewCount > 0 && !record.hearingRequestedDate && !record.statementSubmittedDate) hints.push('Anhörung vor Auswahlentscheidung offen');
  if (record.decisionBeforeHearing) hints.push('Entscheidung vor Anhörung dokumentiert');
  if (record.flaggedForViolationReview) hints.push('Beteiligungsverstoß prüfen');
  return hints;
}

export function suggestNextRecruitingStatus(record: RecruitingParticipationRecord): RecruitingParticipationStatus {
  if (record.status === 'draft' && record.employerNoticeDate) return 'notice_received';
  if (record.status === 'notice_received' && record.interviewCount > 0) return 'interviews_scheduled';
  if (record.status === 'interviews_scheduled' && record.hearingRequestedDate) return 'hearing_pending';
  if (record.status === 'hearing_pending' && record.statementSubmittedDate) return 'statement_submitted';
  if (record.decisionKnownDate) return 'decision_known';
  return record.status;
}
