import type { RecruitingParticipationRecord, RecruitingParticipationStatus } from '../src/app/core/models/recruiting-participation.model.js';

export interface RecruitingStatusAction {
  label: string;
  targetStatus: RecruitingParticipationStatus;
}

export function getRecruitingStatusActions(record: RecruitingParticipationRecord): RecruitingStatusAction[] {
  if (record.status === 'draft') return [{ label: 'Unterrichtung erhalten', targetStatus: 'notice_received' }];
  if (record.status === 'notice_received') return [{ label: 'Gespräche geplant', targetStatus: 'interviews_scheduled' }, { label: 'Anhörung offen', targetStatus: 'hearing_pending' }];
  if (record.status === 'interviews_scheduled') return [{ label: 'Gespräche abgeschlossen', targetStatus: 'interviews_completed' }];
  if (record.status === 'interviews_completed') return [{ label: 'Anhörung offen', targetStatus: 'hearing_pending' }, { label: 'Entscheidung bekannt', targetStatus: 'decision_known' }];
  if (record.status === 'hearing_pending') return [{ label: 'Stellungnahme abgegeben', targetStatus: 'statement_submitted' }, { label: 'Entscheidung bekannt', targetStatus: 'decision_known' }];
  if (record.status === 'statement_submitted') return [{ label: 'Entscheidung bekannt', targetStatus: 'decision_known' }, { label: 'Abschließen', targetStatus: 'closed' }];
  if (record.status === 'decision_known') return [{ label: 'Abschließen', targetStatus: 'closed' }];
  return [];
}

export function shouldSuggestViolationReview(record: RecruitingParticipationRecord): boolean {
  return record.flaggedForViolationReview
    || record.decisionBeforeHearing
    || (record.status === 'decision_known' && !record.statementSubmittedDate && Boolean(record.hasSeverelyDisabledApplicants));
}
