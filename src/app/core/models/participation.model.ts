export type ParticipationMeasureType =
  | 'einstellung'
  | 'versetzung'
  | 'arbeitszeit'
  | 'arbeitsplatzgestaltung'
  | 'abmahnung'
  | 'kuendigung'
  | 'bem_praevention'
  | 'regelung_praxis'
  | 'sonstiges';

export type ParticipationStatus =
  | 'neu'
  | 'unterrichtung_pruefen'
  | 'anhoerung_laeuft'
  | 'stellungnahme_abgegeben'
  | 'aussetzung_verlangt'
  | 'nachholung_laeuft'
  | 'abgeschlossen'
  | 'pflichtverstoss_dokumentiert';

export type ParticipationRiskLevel = 'normal' | 'erhoeht' | 'kritisch';
export type ParticipationPersonStatus = 'schwerbehindert' | 'gleichgestellt' | 'antrag_laeuft' | 'moeglich_betroffen' | 'unklar';
export type ParticipationDecisionStage = 'vor_entscheidung' | 'entscheidung_angekuendigt' | 'entscheidung_getroffen' | 'umgesetzt' | 'unklar';

export interface ParticipationRecord {
  id: string;
  caseId: string;
  title: string;
  measureType: ParticipationMeasureType;
  status: ParticipationStatus;
  riskLevel: ParticipationRiskLevel;
  personStatus: ParticipationPersonStatus;
  decisionStage: ParticipationDecisionStage;
  firstKnownAt?: string;
  informationReceivedAt?: string;
  hearingRequestedAt?: string;
  statementDueAt?: string;
  statementSubmittedAt?: string;
  employerDecisionAt?: string;
  implementationAt?: string;
  informationComplete: boolean;
  hearingBeforeDecision: boolean;
  decisionNotified: boolean;
  suspensionRequestedAt?: string;
  suspensionDueAt?: string;
  violationSummary?: string;
  sbvPosition?: string;
  nextStep?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParticipationInput {
  caseId: string;
  title: string;
  measureType?: ParticipationMeasureType;
  riskLevel?: ParticipationRiskLevel;
  personStatus?: ParticipationPersonStatus;
  decisionStage?: ParticipationDecisionStage;
  firstKnownAt?: string;
  informationReceivedAt?: string;
  hearingRequestedAt?: string;
  statementDueAt?: string;
  informationComplete?: boolean;
  hearingBeforeDecision?: boolean;
  decisionNotified?: boolean;
  violationSummary?: string;
  sbvPosition?: string;
  nextStep?: string;
  createDefaultDeadlines?: boolean;
}

export interface UpdateParticipationInput {
  title?: string;
  measureType?: ParticipationMeasureType;
  status?: ParticipationStatus;
  riskLevel?: ParticipationRiskLevel;
  personStatus?: ParticipationPersonStatus;
  decisionStage?: ParticipationDecisionStage;
  firstKnownAt?: string;
  informationReceivedAt?: string;
  hearingRequestedAt?: string;
  statementDueAt?: string;
  statementSubmittedAt?: string;
  employerDecisionAt?: string;
  implementationAt?: string;
  informationComplete?: boolean;
  hearingBeforeDecision?: boolean;
  decisionNotified?: boolean;
  suspensionRequestedAt?: string;
  suspensionDueAt?: string;
  violationSummary?: string;
  sbvPosition?: string;
  nextStep?: string;
}

export interface ParticipationDashboardSummary {
  open: number;
  critical: number;
  suspensionOpen: number;
  violations: number;
}

export interface ParticipationWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}
