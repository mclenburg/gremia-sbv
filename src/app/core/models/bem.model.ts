export type BemStatus =
  | 'zu_pruefen'
  | 'angebot_vorzubereiten'
  | 'angebot_versendet'
  | 'reaktion_abwarten'
  | 'angenommen'
  | 'abgelehnt'
  | 'gespraech_geplant'
  | 'massnahmen_in_klaerung'
  | 'massnahmen_vereinbart'
  | 'wirksamkeit_pruefen'
  | 'abgeschlossen'
  | 'abgebrochen';

export type BemResponse = 'offen' | 'angenommen' | 'abgelehnt' | 'keine_reaktion';

export type BemLegacyPhase = 'pruefung' | 'angebot' | 'reaktion' | 'gespraech' | 'massnahmen' | 'abschluss';

export type BemTriggerType =
  | 'sechs_wochen_au'
  | 'wiederholt_au'
  | 'praeventiv'
  | 'arbeitgeberangebot'
  | 'sbv_anregung'
  | 'sonstiges';

export interface BemStepDefinition {
  key:
    | 'eligibility'
    | 'offer'
    | 'response'
    | 'first_meeting'
    | 'analysis'
    | 'measures'
    | 'review'
    | 'completion';
  title: string;
  objective: string;
}

export interface BemProcessRecord {
  id: string;
  caseId: string;
  status: BemStatus;
  /** @deprecated Legacy alias for older tests and callers. Use status instead. */
  currentPhase?: BemLegacyPhase;
  title: string;
  triggerType: BemTriggerType;
  triggerDescription?: string;
  sicknessDaysTwelveMonths?: number;
  bemOfferedAt?: string;
  responseDueAt?: string;
  employeeResponse: BemResponse;
  employeeResponseAt?: string;
  privacyNoticeAt?: string;
  consentScope?: string;
  consentWithdrawnAt?: string;
  dataRetentionNote?: string;
  firstMeetingAt?: string;
  participants?: string;
  measures?: string;
  measureOwners?: string;
  nextReviewAt?: string;
  result?: string;
  completionReason?: string;
  confidentialNotes?: string;
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBemProcessInput {
  caseId: string;
  title?: string;
  triggerType?: BemTriggerType;
  triggerDescription?: string;
  sicknessDaysTwelveMonths?: number;
  bemOfferedAt?: string;
  responseDueAt?: string;
  employeeResponse?: BemResponse;
  employeeResponseAt?: string;
  privacyNoticeAt?: string;
  consentScope?: string;
  consentWithdrawnAt?: string;
  dataRetentionNote?: string;
  firstMeetingAt?: string;
  participants?: string;
  measures?: string;
  measureOwners?: string;
  nextReviewAt?: string;
  result?: string;
  completionReason?: string;
  confidentialNotes?: string;
  contactIds?: string[];
  createDefaultDeadlines?: boolean;
}

export interface UpdateBemProcessInput {
  status?: BemStatus;
  title?: string;
  triggerType?: BemTriggerType;
  triggerDescription?: string;
  sicknessDaysTwelveMonths?: number;
  bemOfferedAt?: string;
  responseDueAt?: string;
  employeeResponse?: BemResponse;
  employeeResponseAt?: string;
  privacyNoticeAt?: string;
  consentScope?: string;
  consentWithdrawnAt?: string;
  dataRetentionNote?: string;
  firstMeetingAt?: string;
  participants?: string;
  measures?: string;
  measureOwners?: string;
  nextReviewAt?: string;
  result?: string;
  completionReason?: string;
  confidentialNotes?: string;
  contactIds?: string[];
}

export interface BemDashboardSummary {
  open: number;
  waitingForResponse: number;
  accepted: number;
  dueForResponse: number;
  inMeasures: number;
  completed: number;
}

export interface BemWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}
