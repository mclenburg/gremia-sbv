import type { DeadlineProcessType, DeadlineSeverity, DeadlineType } from '../models/deadline.model';

export const deadlineProcessTypeLabels: Record<DeadlineProcessType, string> = {
  case: 'Fallakte',
  bem: 'BEM',
  prevention: 'Prävention',
  equalization: 'Gleichstellung',
  termination_hearing: 'Kündigungsanhörung',
  gdb: 'GdB',
  custom: 'Freie Wiedervorlage',
  sbv_control_protocol: 'SBV-Steuerungsprotokoll',
  activity_journal: 'Tätigkeitsjournal',
  sbv_participation_violation: 'Beteiligungsverstoß',
  recruiting_participation: 'Stellenbesetzung',
};

export const deadlineTypeLabels: Record<DeadlineType, string> = {
  follow_up: 'Wiedervorlage',
  legal_deadline: 'Rechtsfrist',
  workflow_step: 'Workflow-Schritt',
  appointment: 'Termin',
  warning: 'Warnung',
};

export const deadlineSeverityLabels: Record<DeadlineSeverity, string> = {
  normal: 'normal',
  important: 'wichtig',
  critical: 'kritisch',
  fatal: 'kritisch / sofort',
};
