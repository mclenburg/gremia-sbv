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
  createdAt: string;
  updatedAt: string;
}

export interface CreateEqualizationProcessInput {
  caseId: string;
  applicationStatus?: EqualizationStatus;
  agencyReference?: string;
  applicationSubmittedAt?: string;
  decisionReceivedAt?: string;
  objectionDueAt?: string;
  outcome?: string;
  notes?: string;
  createDefaultDeadline?: boolean;
}

export interface UpdateEqualizationProcessInput {
  applicationStatus?: EqualizationStatus;
  agencyReference?: string;
  applicationSubmittedAt?: string;
  decisionReceivedAt?: string;
  objectionDueAt?: string;
  outcome?: string;
  notes?: string;
}

export interface EqualizationWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}
