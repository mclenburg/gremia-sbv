export const PARTICIPATION_VIOLATION_STAGES = [
  'request',
  'formal_objection',
  'abmahnung',
  'suspension_request',
  'owi_preparation',
] as const;

export type ParticipationViolationStage = typeof PARTICIPATION_VIOLATION_STAGES[number];

export const PARTICIPATION_VIOLATION_STATUSES = [
  'draft',
  'open',
  'sent',
  'remedied',
  'escalated',
  'closed',
  'withdrawn',
] as const;

export type ParticipationViolationStatus = typeof PARTICIPATION_VIOLATION_STATUSES[number];

export const PARTICIPATION_VIOLATION_TYPES = [
  'not_informed',
  'late_informed',
  'incomplete_information',
  'not_heard',
  'late_heard',
  'implementation_without_participation',
  'repeated_violation',
  'other',
] as const;

export type ParticipationViolationType = typeof PARTICIPATION_VIOLATION_TYPES[number];

export const PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES = [
  'case',
  'case_measure_participation',
  'sbv_participation',
  'termination_hearing',
  'sbv_control_protocol',
  'deadline',
  'activity_journal',
] as const;

export type ParticipationViolationSourceContextType = typeof PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES[number];

export const PARTICIPATION_VIOLATION_EVENT_TYPES = [
  'created',
  'updated',
  'status_changed',
  'document_generated',
  'marked_sent',
  'deadline_created',
  'deadline_closed',
  'remedied',
  'escalated',
  'closed',
  'withdrawn',
] as const;

export type ParticipationViolationEventType = typeof PARTICIPATION_VIOLATION_EVENT_TYPES[number];

export const PARTICIPATION_VIOLATION_STATUS_TRANSITIONS = {
  draft: ['open', 'sent', 'withdrawn'],
  open: ['sent', 'withdrawn', 'closed'],
  sent: ['remedied', 'escalated', 'closed'],
  remedied: ['closed', 'escalated'],
  escalated: ['remedied', 'closed'],
  withdrawn: [],
  closed: [],
} as const satisfies Record<ParticipationViolationStatus, readonly ParticipationViolationStatus[]>;

export interface SbvParticipationViolationRecord {
  id: string;
  stage: ParticipationViolationStage;
  status: ParticipationViolationStatus;
  violationType: ParticipationViolationType;
  sourceContextType: ParticipationViolationSourceContextType;
  sourceContextId: string;
  caseId?: string;
  relatedParticipationId?: string;
  relatedCaseMeasureId?: string;
  relatedTerminationHearingId?: string;
  relatedDeadlineId?: string;
  relatedActivityJournalEntryId?: string;
  relatedSbvControlProtocolId?: string;
  subject: string;
  measureDescription: string;
  wrongBehavior: string;
  requiredBehavior: string;
  consequenceWarning?: string;
  legalBasis: string;
  followUpDueAt?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  closedAt?: string;
}

export interface SbvParticipationViolationEventRecord {
  id: string;
  violationId: string;
  eventType: ParticipationViolationEventType;
  fromStatus?: ParticipationViolationStatus;
  toStatus?: ParticipationViolationStatus;
  note?: string;
  createdAt: string;
}

export interface SbvParticipationViolationListFilter {
  status?: ParticipationViolationStatus | ParticipationViolationStatus[];
  stage?: ParticipationViolationStage | ParticipationViolationStage[];
  sourceContextType?: ParticipationViolationSourceContextType;
  caseId?: string;
  query?: string;
}

export interface CreateSbvParticipationViolationInput {
  stage: ParticipationViolationStage;
  status?: ParticipationViolationStatus;
  violationType: ParticipationViolationType;
  sourceContextType: ParticipationViolationSourceContextType;
  sourceContextId: string;
  caseId?: string;
  relatedParticipationId?: string;
  relatedCaseMeasureId?: string;
  relatedTerminationHearingId?: string;
  relatedDeadlineId?: string;
  relatedActivityJournalEntryId?: string;
  relatedSbvControlProtocolId?: string;
  subject: string;
  measureDescription: string;
  wrongBehavior: string;
  requiredBehavior: string;
  consequenceWarning?: string;
  legalBasis?: string;
  followUpDueAt?: string;
}

export type UpdateSbvParticipationViolationInput = Partial<Omit<CreateSbvParticipationViolationInput, 'sourceContextType' | 'sourceContextId'>> & {
  sourceContextType?: ParticipationViolationSourceContextType;
  sourceContextId?: string;
};

export interface SbvParticipationViolationStatusChangeInput {
  status: ParticipationViolationStatus;
  note?: string;
}

export interface SbvParticipationViolationTemplateInput {
  stage: ParticipationViolationStage;
  subject: string;
  recipientLabel?: string;
  sourceReference: string;
  measureDescription: string;
  wrongBehavior: string;
  requiredBehavior: string;
  consequenceWarning?: string;
  followUpDueAt?: string;
  includeOwiHint: boolean;
  includeLegalReviewHint: boolean;
  privacyMode: 'case_reference' | 'personalized';
}

export interface SbvParticipationViolationTemplateValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface SbvParticipationViolationGeneratedDocumentRecord {
  id: string;
  violationId: string;
  documentId: string;
  stage: ParticipationViolationStage;
  templateKey: string;
  templateVersion: string;
  immutableSnapshot: boolean;
  createdAt: string;
}

export interface SbvParticipationViolationFollowUpResult {
  deadlineId: string;
  dueAt: string;
  title: string;
}

export interface SbvParticipationViolationDocumentResult {
  documentId: string;
  violationDocumentId: string;
  title: string;
  filename: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
  templateKey: string;
  templateVersion: string;
  storagePath: string;
  legalReviewHint: boolean;
  warnings: string[];
}
