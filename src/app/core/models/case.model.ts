export type CaseStatus = 'offen' | 'in_bearbeitung' | 'ruhend' | 'abgeschlossen';
export type CasePriority = 'normal' | 'wichtig' | 'kritisch';

export type CaseCategory =
  | 'bem'
  | 'praevention'
  | 'kuendigung'
  | 'gleichstellung'
  | 'gdb'
  | 'nachteilsausgleich'
  | 'diskriminierung'
  | 'arbeitsplatzgestaltung'
  | 'teilzeit'
  | 'sonstiges';

export interface CaseRecord {
  id: string;
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  status: CaseStatus;
  priority: CasePriority;
  openedAt: string;
  closedAt?: string;
  summary?: string;
  isPseudonymized: boolean;
  isLocked: boolean;
}

export interface CreateCaseInput {
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  summary?: string;
  priority?: CasePriority;
  isPseudonymized?: boolean;
}
