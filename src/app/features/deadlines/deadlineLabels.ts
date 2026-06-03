import type { DeadlineProcessType, DeadlineSeverity, DeadlineType } from '../../core/models/deadline.model';
import type { IcalExportPrivacyLevel } from './useIcalExportHandlers';

export type DeadlineExportScope = 'open' | 'dashboard' | 'all';

export const deadlineProcessTypeLabels: Record<DeadlineProcessType, string> = {
  case: 'Fallakte',
  bem: 'BEM',
  prevention: 'Prävention',
  equalization: 'Gleichstellung',
  termination_hearing: 'Kündigungsanhörung',
  gdb: 'GdB',
  custom: 'Freie Wiedervorlage',
  sbv_control_protocol: 'SBV-Steuerungsprotokoll'
};

export const deadlineTypeLabels: Record<DeadlineType, string> = {
  follow_up: 'Wiedervorlage',
  legal_deadline: 'Rechtsfrist',
  workflow_step: 'Workflow-Schritt',
  appointment: 'Termin',
  warning: 'Warnung'
};

export const deadlineSeverityLabels: Record<DeadlineSeverity, string> = {
  normal: 'normal',
  important: 'wichtig',
  critical: 'kritisch',
  fatal: 'kritisch / sofort'
};

export const icalPrivacyLevelLabels: Record<IcalExportPrivacyLevel, string> = {
  process_type: 'Vorgangstyp · Standard',
  privacy_first: 'Neutral · maximal datensparsam',
  case_reference: 'Fallreferenz · ohne Personennamen',
  details: 'Detailtitel · nur nach Prüfung'
};

export const icalPrivacyLevelHelp: Record<IcalExportPrivacyLevel, string> = {
  privacy_first: 'Kalendereinträge heißen neutral „Gremia.SBV Wiedervorlage“. Es werden keine Fall- oder Prozesshinweise exportiert.',
  process_type: 'Standard: Kalendereinträge nutzen sprechende Vorgangstypen wie BEM-Frist, aber keine Personen- oder Fallinhalte.',
  case_reference: 'Exportiert zusätzlich eine technische Fallreferenz ohne Personennamen. Nur nutzen, wenn der Kalender dafür freigegeben ist.',
  details: 'Exportiert Detailtitel nach Direktidentifikator-Prüfung. Nur bewusst verwenden, wenn der Kalender geschützt ist.'
};

export const icalScopeLabels: Record<DeadlineExportScope, string> = {
  open: 'Offene und überfällige Fristen',
  dashboard: 'Nur heute relevante Fristen',
  all: 'Alle Fristen'
};
