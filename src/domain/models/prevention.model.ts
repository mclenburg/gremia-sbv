export type PreventionDifficultyType =
  | 'personenbedingt'
  | 'verhaltensbedingt'
  | 'betriebsbedingt'
  | 'organisatorisch'
  | 'gesundheitlich_arbeitsplatzbezogen'
  | 'konflikt_fuehrung'
  | 'sonstiges';

export type PreventionRiskType =
  | 'abmahnung'
  | 'kuendigung'
  | 'umsetzung'
  | 'arbeitsunfaehigkeit'
  | 'ueberlastung'
  | 'leistungsverlust'
  | 'arbeitsplatzverlust'
  | 'sonstiges';

export type PreventionStatus =
  | 'zu_pruefen'
  | 'angefordert'
  | 'arbeitgeber_reagiert'
  | 'inklusionsamt_eingeschaltet'
  | 'massnahmen_in_klaerung'
  | 'massnahmen_vereinbart'
  | 'abgeschlossen'
  | 'blockiert_verweigert';

export type PreventionStepKey =
  | 'hazard'
  | 'person_status'
  | 'difficulty'
  | 'employer_request'
  | 'contacts'
  | 'integration_office'
  | 'measures'
  | 'review'
  | 'completion';

export interface PreventionStepDefinition {
  key: PreventionStepKey;
  title: string;
  objective: string;
}

export interface PreventionProcessRecord {
  id: string;
  caseId: string;
  status: PreventionStatus;
  firstKnowledgeAt?: string;
  requestedAt?: string;
  employerResponseDueAt?: string;
  employerRespondedAt?: string;
  integrationOfficeInvolvedAt?: string;
  difficultyType: PreventionDifficultyType;
  riskType: PreventionRiskType;
  personStatus: 'schwerbehindert' | 'gleichgestellt' | 'antrag_laeuft' | 'unklar';
  hazardDescription?: string;
  employerRequestSummary?: string;
  measures?: string;
  result?: string;
  nextReviewAt?: string;
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreventionProcessInput {
  caseId: string;
  firstKnowledgeAt?: string;
  difficultyType?: PreventionDifficultyType;
  riskType?: PreventionRiskType;
  personStatus?: PreventionProcessRecord['personStatus'];
  hazardDescription?: string;
  employerResponseDueAt?: string;
  requestedAt?: string;
  contactIds?: string[];
  createDefaultDeadlines?: boolean;
}

export interface UpdatePreventionProcessInput {
  status?: PreventionStatus;
  firstKnowledgeAt?: string;
  requestedAt?: string;
  employerResponseDueAt?: string;
  employerRespondedAt?: string;
  integrationOfficeInvolvedAt?: string;
  difficultyType?: PreventionDifficultyType;
  riskType?: PreventionRiskType;
  personStatus?: PreventionProcessRecord['personStatus'];
  hazardDescription?: string;
  employerRequestSummary?: string;
  measures?: string;
  result?: string;
  nextReviewAt?: string;
  contactIds?: string[];
}

export interface PreventionWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}

export interface PreventionDashboardSummary {
  open: number;
  critical: number;
  blocked: number;
  dueForEmployerResponse: number;
}
