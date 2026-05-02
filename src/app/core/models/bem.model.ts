export type BemConsentStatus = 'offen' | 'erteilt' | 'abgelehnt' | 'widerrufen';
export type BemPhase =
  | 'pruefung'
  | 'einladung'
  | 'zustimmung'
  | 'erstgespraech'
  | 'klaerung'
  | 'massnahmen'
  | 'evaluation'
  | 'abgeschlossen';

export type BemMeasureStatus = 'geplant' | 'in_umsetzung' | 'wirksam' | 'nicht_wirksam' | 'verworfen';

export interface BemProcessRecord {
  id: string;
  caseId: string;
  triggerDate?: string;
  auDaysIn12Months?: number;
  invitationSentAt?: string;
  responseDueAt?: string;
  consentStatus: BemConsentStatus;
  firstMeetingAt?: string;
  currentPhase: BemPhase;
  sbvInvolved: boolean;
  brInvolved: boolean;
  worksDoctorInvolved: boolean;
  integrationOfficeInvolved: boolean;
  notes?: string;
}

export interface BemMeasureRecord {
  id: string;
  bemProcessId: string;
  title: string;
  description?: string;
  responsibleParty?: string;
  dueAt?: string;
  status: BemMeasureStatus;
  evaluationNotes?: string;
}
