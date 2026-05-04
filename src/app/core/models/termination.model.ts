export type TerminationHearingStatus =
  | 'eingang'
  | 'unterlagen_pruefen'
  | 'sbv_anhoerung_offen'
  | 'integrationsamt_pruefen'
  | 'stellungnahme_in_arbeit'
  | 'stellungnahme_abgegeben'
  | 'abgeschlossen';

export type TerminationType =
  | 'ordentlich'
  | 'ausserordentlich'
  | 'aenderungskuendigung'
  | 'verdachtskuendigung'
  | 'personenbedingt'
  | 'verhaltensbedingt'
  | 'betriebsbedingt'
  | 'sonstiges';

export type DisabilityProtectionStatus =
  | 'schwerbehindert'
  | 'gleichgestellt'
  | 'antrag_laeuft'
  | 'unklar'
  | 'nicht_bekannt';

export interface TerminationHearingRecord {
  id: string;
  caseId: string;
  status: TerminationHearingStatus;
  terminationType: TerminationType;
  protectionStatus: DisabilityProtectionStatus;
  receivedAt?: string;
  employerDeadlineAt?: string;
  sbvStatementDueAt?: string;
  worksCouncilHearingAt?: string;
  integrationOfficeRequestedAt?: string;
  integrationOfficeDecisionAt?: string;
  integrationOfficeDecision?: string;
  employerReason?: string;
  missingInformation?: string;
  sbvAssessment?: string;
  statement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTerminationHearingInput {
  caseId: string;
  status?: TerminationHearingStatus;
  terminationType?: TerminationType;
  protectionStatus?: DisabilityProtectionStatus;
  receivedAt?: string;
  employerDeadlineAt?: string;
  sbvStatementDueAt?: string;
  worksCouncilHearingAt?: string;
  integrationOfficeRequestedAt?: string;
  integrationOfficeDecisionAt?: string;
  integrationOfficeDecision?: string;
  employerReason?: string;
  missingInformation?: string;
  sbvAssessment?: string;
  statement?: string;
}

export interface UpdateTerminationHearingInput {
  status?: TerminationHearingStatus;
  terminationType?: TerminationType;
  protectionStatus?: DisabilityProtectionStatus;
  receivedAt?: string;
  employerDeadlineAt?: string;
  sbvStatementDueAt?: string;
  worksCouncilHearingAt?: string;
  integrationOfficeRequestedAt?: string;
  integrationOfficeDecisionAt?: string;
  integrationOfficeDecision?: string;
  employerReason?: string;
  missingInformation?: string;
  sbvAssessment?: string;
  statement?: string;
}

export interface TerminationHearingWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}
