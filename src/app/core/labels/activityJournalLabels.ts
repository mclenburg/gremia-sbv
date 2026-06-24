import type { ActivityJournalCategory, ActivityJournalTimeMode } from '../models/activity-journal.model';

export const activityJournalCategoryLabels: Record<ActivityJournalCategory, string> = {
  case_work: 'Fallbearbeitung',
  consultation: 'Beratung / Sprechstunde',
  bem_preparation: 'BEM / Wiedereingliederung',
  prevention: 'Prävention',
  participation: 'Beteiligung / Anhörung',
  employer_meeting: 'Arbeitgebergespräch',
  committee_work: 'BR-/Ausschussarbeit',
  sbv_steering: 'SBV-Steuerung / Strategie',
  research: 'Recherche / Recht',
  documentation: 'Dokumentation / Nachbereitung',
  qualification: 'Schulung / Qualifizierung',
  external_network: 'Externe Stellen',
  sbv_self_organization: 'SBV-Selbstorganisation',
};

export const activityJournalTimeModeLabels: Record<ActivityJournalTimeMode, string> = {
  none: 'keine Zeitangabe',
  duration: 'Dauer',
  range: 'Zeitraum',
  timer: 'Timer',
};

export function getActivityJournalCategoryLabel(category: ActivityJournalCategory): string {
  return activityJournalCategoryLabels[category];
}
