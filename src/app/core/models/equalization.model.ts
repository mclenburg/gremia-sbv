export type EqualizationStatus =
  | 'beratung'
  | 'vorbereitung'
  | 'eingereicht'
  | 'nachfrage'
  | 'bewilligt'
  | 'abgelehnt'
  | 'widerspruch'
  | 'abgeschlossen';

export interface EqualizationProcessRecord {
  id: string;
  caseId: string;
  applicationStatus: EqualizationStatus;
  agencyReference?: string;
  applicationSubmittedAt?: string;
  decisionReceivedAt?: string;
  objectionDueAt?: string;
  outcome?: string;
  notes?: string;
}
