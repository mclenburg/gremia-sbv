export type CaseMeasureType =
  | 'bem'
  | 'prevention'
  | 'sbv_participation'
  | 'termination_hearing'
  | 'equalization_gdb'
  | 'workplace_accommodation'
  | 'other';

export type CaseMeasureStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'waiting'
  | 'follow_up_required'
  | 'completed'
  | 'cancelled';

export type CaseMeasureRiskLevel = 'normal' | 'erhoeht' | 'kritisch';
export type CaseMeasureCreatedFrom = 'manual' | 'inline_command' | 'migration' | 'import';

export interface CaseMeasureRecord {
  id: string;
  caseId: string;
  type: CaseMeasureType;
  title: string;
  status: CaseMeasureStatus;
  riskLevel: CaseMeasureRiskLevel;
  createdFrom: CaseMeasureCreatedFrom;
  summary?: string;
  nextStep?: string;
  dueAt?: string;
  openedAt: string;
  closedAt?: string;
  requiresFollowUp: boolean;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseMeasureInput {
  caseId: string;
  type: CaseMeasureType;
  title: string;
  status?: CaseMeasureStatus;
  riskLevel?: CaseMeasureRiskLevel;
  createdFrom?: CaseMeasureCreatedFrom;
  summary?: string;
  nextStep?: string;
  dueAt?: string;
  openedAt?: string;
  requiresFollowUp?: boolean;
  sourceId?: string;
}

export interface UpdateCaseMeasureInput {
  title?: string;
  status?: CaseMeasureStatus;
  riskLevel?: CaseMeasureRiskLevel;
  summary?: string;
  nextStep?: string;
  dueAt?: string;
  closedAt?: string;
  requiresFollowUp?: boolean;
}

export const caseMeasureTypeLabels: Record<CaseMeasureType, string> = {
  bem: 'BEM',
  prevention: 'Prävention',
  sbv_participation: 'SBV-Beteiligung',
  termination_hearing: 'Kündigungsanhörung',
  equalization_gdb: 'Gleichstellung / GdB',
  workplace_accommodation: 'Arbeitsplatzgestaltung',
  other: 'Sonstige Maßnahme'
};

export type CaseMeasureNoteProcessType =
  | 'prevention'
  | 'bem'
  | 'termination_hearing'
  | 'equalization'
  | 'participation'
  | 'workplace_accommodation';

export interface CaseMeasureNoteRecord {
  id: string;
  caseId: string;
  measureType: CaseMeasureNoteProcessType;
  measureId: string;
  title: string;
  noteAt: string;
  participants?: string;
  content: string;
  nextSteps?: string;
  containsHealthData: boolean;
  confidentialLevel: 'normal' | 'sensibel' | 'hoch_sensibel';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseMeasureNoteInput {
  caseId: string;
  measureType: CaseMeasureNoteProcessType;
  measureId: string;
  title: string;
  noteAt?: string;
  participants?: string;
  content: string;
  nextSteps?: string;
  containsHealthData?: boolean;
  confidentialLevel?: 'normal' | 'sensibel' | 'hoch_sensibel';
}

export interface UpdateCaseMeasureNoteInput {
  title?: string;
  noteAt?: string;
  participants?: string;
  content?: string;
  nextSteps?: string;
  containsHealthData?: boolean;
  confidentialLevel?: 'normal' | 'sensibel' | 'hoch_sensibel';
}
