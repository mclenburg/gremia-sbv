export const DEADLINE_PROCESS_TYPES = [
  'case',
  'bem',
  'prevention',
  'equalization',
  'termination_hearing',
  'gdb',
  'custom',
  'sbv_control_protocol',
  'activity_journal',
  'sbv_participation_violation',
  'recruiting_participation',
] as const;

export const DEADLINE_TYPES = ['legal_deadline', 'follow_up', 'appointment', 'warning', 'workflow_step'] as const;
export const DEADLINE_SEVERITIES = ['normal', 'important', 'critical', 'fatal'] as const;

export type DeadlineProcessType =
  | 'case'
  | 'bem'
  | 'prevention'
  | 'equalization'
  | 'termination_hearing'
  | 'gdb'
  | 'custom'
  | 'sbv_control_protocol'
  | 'activity_journal'
  | 'sbv_participation_violation'
  | 'recruiting_participation';

export type DeadlineType = 'legal_deadline' | 'follow_up' | 'appointment' | 'warning' | 'workflow_step';
export type DeadlineSeverity = 'normal' | 'important' | 'critical' | 'fatal';
export type DeadlineStatus = 'open' | 'done' | 'overdue' | 'suspended' | 'cancelled';
export type DeadlineCalculationMode = 'manual' | 'template' | 'legal' | 'workflow';
export type DeadlineDashboardState = 'hidden' | 'upcoming' | 'due_soon' | 'critical' | 'overdue';

export interface DeadlineRecord {
  id: string;
  caseId?: string;
  measureId?: string;
  personId?: string;
  processId?: string;
  processType: DeadlineProcessType;
  deadlineType: DeadlineType;
  title: string;
  confidentialTitle?: string;
  description?: string;
  dueAt: string;
  reminderAt?: string;
  legalBasis?: string;
  sourceEvent?: string;
  severity: DeadlineSeverity;
  status: DeadlineStatus;
  calculationMode: DeadlineCalculationMode;
  isLegalDeadline: boolean;
  isUserEditable: boolean;
  warningThresholdHours: number;
  criticalThresholdHours: number;
  dashboardFromAt?: string;
  completedAt?: string;
  completedNote?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineTemplateRecord {
  id: string;
  templateKey: string;
  title: string;
  confidentialTitle?: string;
  description?: string;
  processType: DeadlineProcessType;
  deadlineType: DeadlineType;
  offsetDays: number;
  offsetHours: number;
  reminderDaysBefore?: number;
  legalBasis?: string;
  severity: DeadlineSeverity;
  isLegalDeadline: boolean;
  warningThresholdHours: number;
  criticalThresholdHours: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeadlineInput {
  caseId?: string;
  measureId?: string;
  personId?: string;
  processId?: string;
  processType: DeadlineProcessType;
  deadlineType?: DeadlineType;
  title: string;
  confidentialTitle?: string;
  description?: string;
  dueAt: string;
  reminderAt?: string;
  legalBasis?: string;
  sourceEvent?: string;
  severity?: DeadlineSeverity;
  calculationMode?: DeadlineCalculationMode;
  isLegalDeadline?: boolean;
  isUserEditable?: boolean;
  warningThresholdHours?: number;
  criticalThresholdHours?: number;
}

export interface UpdateDeadlineInput {
  title?: string;
  confidentialTitle?: string;
  description?: string;
  dueAt?: string;
  reminderAt?: string;
  legalBasis?: string;
  sourceEvent?: string;
  severity?: DeadlineSeverity;
  status?: DeadlineStatus;
  completedNote?: string;
  cancelledReason?: string;
  warningThresholdHours?: number;
  criticalThresholdHours?: number;
  reason?: string;
}

export interface DeadlineAuditRecord {
  id: string;
  deadlineId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
}

export interface DeadlineDashboardItem extends DeadlineRecord {
  dashboardState: DeadlineDashboardState;
  hoursRemaining: number;
  safeTitle: string;
  actionHint: string;
}

export interface DeadlineListFilters {
  status?: DeadlineStatus[];
  processType?: DeadlineProcessType[];
  caseId?: string;
  measureId?: string;
  from?: string;
  to?: string;
  dashboardOnly?: boolean;
}

export interface CreateFromTemplateInput {
  templateKey: string;
  baseDate: string;
  caseId?: string;
  measureId?: string;
  personId?: string;
  processId?: string;
  overrideTitle?: string;
  overrideDueAt?: string;
  sourceEvent?: string;
}
