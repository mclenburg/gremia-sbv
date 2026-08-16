export type SbvMeetingType = 'works_council' | 'council_committee' | 'health_safety' | 'employer_council_meeting' | 'works_assembly' | 'other';
export type SbvMeetingStatus = 'draft' | 'planned' | 'held' | 'closed';
export type EmployerReportStatus = 'not_requested' | 'requested' | 'promised' | 'completed' | 'not_completed';
export type ObligationStatus = 'not_due' | 'due' | 'requested' | 'received' | 'reviewing' | 'compliant' | 'issue_found' | 'follow_up' | 'closed';
export type AgreementStatus = 'not_started' | 'negotiation_requested' | 'negotiating' | 'stalled' | 'agreed' | 'review_due' | 'superseded';
export type ComplaintAssessment = 'open' | 'justified' | 'unclear' | 'unjustified';

export interface SbvMeetingRecord {
  id: string; meetingType: SbvMeetingType; title: string; startsAt: string; location?: string;
  invitationReceivedAt?: string; agendaReceivedAt?: string; attendanceStatus: string; status: SbvMeetingStatus;
  notes?: string; createdAt: string; updatedAt: string; agenda: SbvMeetingAgendaItemRecord[];
}
export interface SbvMeetingAgendaItemRecord {
  id: string; meetingId: string; position: number; title: string; sbvRelevance: boolean; referenceScope?: string;
  documentsStatus?: string; ownPosition?: string; requestedBySbv: boolean; requestAt?: string; requestContent?: string;
  requestReaction?: string; resolutionAt?: string; resolutionSummary?: string; impairmentAssessment?: string;
  significantImpairment: boolean; nonParticipation: boolean; suspensionRequestedAt?: string; suspensionDueAt?: string;
  outcome?: string; status: string;
}
export interface CreateSbvMeetingInput { meetingType: SbvMeetingType; title: string; startsAt: string; location?: string; status?: SbvMeetingStatus; }
export type UpdateSbvMeetingInput = Partial<CreateSbvMeetingInput & { invitationReceivedAt: string; agendaReceivedAt: string; attendanceStatus: string; notes: string }>;
export interface UpsertSbvMeetingAgendaInput extends Partial<Omit<SbvMeetingAgendaItemRecord, 'id'|'meetingId'>> { id?: string; title: string; }

export interface SbvAssemblyRecord {
  id: string; year: number; scheduledAt?: string; locationOrMode?: string; invitationAt?: string; agenda?: string;
  accessibilityCheckStatus?: string; materialsStatus?: string; employerReportStatus: EmployerReportStatus; minutes?: string;
  status: string; createdAt: string; updatedAt: string;
}
export interface SaveSbvAssemblyInput extends Partial<Omit<SbvAssemblyRecord,'id'|'createdAt'|'updatedAt'>> { id?: string; year: number; }

export const EMPLOYER_OBLIGATION_KEYS = ['employment_report_163_2','employment_quota_154','vacancy_review_164_1','prevention_167','inclusion_officer_181','inclusion_agreement_166','sbv_election_result_notification_163_8'] as const;
export type EmployerObligationKey = typeof EMPLOYER_OBLIGATION_KEYS[number];
export const EMPLOYER_OBLIGATION_LABELS: Record<EmployerObligationKey, string> = {
  employment_report_163_2: 'Anzeige und Verzeichnis (§ 163 Abs. 2)',
  employment_quota_154: 'Beschäftigungsquote (§ 154)',
  vacancy_review_164_1: 'Prüfung freier Stellen (§ 164 Abs. 1)',
  prevention_167: 'Prävention (§ 167)',
  inclusion_officer_181: 'Inklusionsbeauftragter (§ 181)',
  inclusion_agreement_166: 'Inklusionsvereinbarung (§ 166)',
  sbv_election_result_notification_163_8: 'Wahlergebnis-Benennung (§ 163 Abs. 8)',
};
export interface EmployerObligationReviewRecord {
  id: string; obligationKey: EmployerObligationKey; periodYear: number; scopeKey: string; dueAt?: string; requestedAt?: string;
  receivedAt?: string; reviewedAt?: string; status: ObligationStatus; finding?: string; nextAction?: string; followUpDueAt?: string;
  createdAt: string; updatedAt: string;
}
export interface SaveEmployerObligationReviewInput extends Partial<Omit<EmployerObligationReviewRecord,'id'|'createdAt'|'updatedAt'>> { id?: string; obligationKey: EmployerObligationKey; periodYear: number; scopeKey?: string; }
export interface InclusionOfficerSnapshotRecord { id:string; name?:string; function?:string; appointedAt?:string; notificationAgencyAt?:string; notificationIntegrationOfficeAt?:string; verifiedAt?:string; status:string; createdAt:string; updatedAt:string; }
export type SaveInclusionOfficerSnapshotInput = Partial<Omit<InclusionOfficerSnapshotRecord,'id'|'createdAt'|'updatedAt'>>;

export const INCLUSION_AGREEMENT_TOPIC_KEYS = ['personnel_planning','workplace_design','work_environment','work_organization','working_time','vacancies','employment_quota','part_time','training_youth','prevention_bem_health','occupational_physician'] as const;
export type InclusionAgreementTopicKey = typeof INCLUSION_AGREEMENT_TOPIC_KEYS[number];
export const INCLUSION_AGREEMENT_TOPIC_LABELS: Record<InclusionAgreementTopicKey, string> = {
  personnel_planning: 'Personalplanung',
  workplace_design: 'Arbeitsplatzgestaltung',
  work_environment: 'Arbeitsumfeld',
  work_organization: 'Arbeitsorganisation',
  working_time: 'Arbeitszeit',
  vacancies: 'Besetzung freier Stellen',
  employment_quota: 'Beschäftigungsquote',
  part_time: 'Teilzeit',
  training_youth: 'Ausbildung behinderter Jugendlicher',
  prevention_bem_health: 'Prävention, BEM und Gesundheitsförderung',
  occupational_physician: 'Werks-/Betriebsarzt und Teilhabeleistungen',
};
export interface InclusionAgreementTopicRecord { id:string; agreementId:string; topicKey:InclusionAgreementTopicKey; currentState?:string; sbvTarget?:string; employerPosition?:string; councilPosition?:string; resultText?:string; status:string; }
export interface InclusionAgreementRecord { id:string; title:string; status:AgreementStatus; requestedAt?:string; employerResponseAt?:string; integrationOfficeInvitedAt?:string; signedAt?:string; sentAgencyAt?:string; sentIntegrationOfficeAt?:string; reviewDueAt?:string; createdAt:string; updatedAt:string; topics:InclusionAgreementTopicRecord[]; }
export interface SaveInclusionAgreementInput extends Partial<Omit<InclusionAgreementRecord,'id'|'createdAt'|'updatedAt'|'topics'>> { id?: string; title:string; }
export interface SaveInclusionAgreementTopicInput extends Partial<Omit<InclusionAgreementTopicRecord,'id'|'agreementId'|'topicKey'>> { topicKey:InclusionAgreementTopicKey; }

export interface ComplaintWorkflowRecord { id:string; caseId:string; receivedAt:string; assessmentStatus:ComplaintAssessment; employerContactedAt?:string; negotiationStatus?:string; resultSummary?:string; personInformedAt?:string; status:string; createdAt:string; updatedAt:string; }
export interface SaveComplaintWorkflowInput extends Partial<Omit<ComplaintWorkflowRecord,'id'|'createdAt'|'updatedAt'>> { caseId:string; receivedAt:string; }

export type QuickCaseTemplateKey = 'additional_leave'|'overtime'|'qualification'|'working_time'|'part_time'|'discrimination_agg'|'assistive_device';
export interface QuickCaseTemplate { key: QuickCaseTemplateKey; title: string; legalBasis: string; checklist: string[]; }
