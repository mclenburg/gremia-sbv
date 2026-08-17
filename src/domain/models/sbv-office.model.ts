export const MEETING_TYPES = [
  'works_council',
  'council_committee',
  'health_safety',
  'employer_council_meeting',
  'works_assembly',
  'other',
] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const OBLIGATION_STATUSES = [
  'not_due',
  'due',
  'requested',
  'received',
  'reviewing',
  'compliant',
  'issue_found',
  'follow_up',
  'closed',
] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

export const AGREEMENT_STATUSES = [
  'not_started',
  'negotiation_requested',
  'negotiating',
  'stalled',
  'agreed',
  'review_due',
  'superseded',
] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];
