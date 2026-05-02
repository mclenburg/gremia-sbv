export type TerminationType = 'ordentlich' | 'ausserordentlich' | 'aenderungskuendigung' | 'unbekannt';
export type IntegrationOfficeApprovalStatus = 'unbekannt' | 'beantragt' | 'erteilt' | 'abgelehnt' | 'nicht_erforderlich';
export type TerminationStatementStatus = 'offen' | 'in_bearbeitung' | 'abgegeben' | 'keine_stellungnahme';

export interface TerminationHearingRecord {
  id: string;
  caseId: string;
  hearingReceivedAt: string;
  employerDeadlineAt?: string;
  terminationType: TerminationType;
  sbvHearingComplete: boolean;
  brHearingKnown: boolean;
  integrationOfficeApprovalRequired: boolean;
  integrationOfficeApprovalStatus: IntegrationOfficeApprovalStatus;
  statementStatus: TerminationStatementStatus;
  statementSentAt?: string;
  riskNotes?: string;
}
