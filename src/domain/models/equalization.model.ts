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
  /** @deprecated Gleichstellungsnotizen werden ab 0.6.3 als verschlüsselte Fallnotizen geführt. */
  notes?: string;
  legacyPlaintextNotesPresent?: boolean;
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

export type EqualizationIntakePersonInput =
  | { mode: 'existing'; protectedPersonId: string }
  | { mode: 'new_identified'; firstName: string; lastName: string }
  | { mode: 'new_pseudonymous'; pseudonymLabel: string };

export interface CreateEqualizationIntakeInput {
  person: EqualizationIntakePersonInput;
  caseNumber: string;
  category: 'gleichstellung' | 'gdb';
  summary?: string;
}

export interface EqualizationIntakeResult {
  person: import('./protected-person.model.js').ProtectedPersonRecord;
  caseRecord: import('./case.model.js').CaseRecord;
  process: EqualizationProcessRecord;
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
