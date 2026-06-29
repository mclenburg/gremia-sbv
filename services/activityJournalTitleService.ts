import type { ActivityJournalCategory, ActivityJournalContextType } from '../src/app/core/models/activity-journal.model.js';

export interface ActivityJournalTitleContext {
  contextType?: ActivityJournalContextType;
  caseNumber?: string;
  title?: string;
}

export class ActivityJournalTitleService {
  synthesizeTitle(context: ActivityJournalTitleContext = {}, category: ActivityJournalCategory = 'documentation'): string {
    if (context.contextType === 'case') {
      const caseReference = context.caseNumber?.trim() || context.title?.trim() || 'Fall';
      return `${caseReference}: Tätigkeit dokumentiert`;
    }
    if (context.contextType === 'bem_process' || category === 'bem_preparation') return 'BEM-Begleitung: Gespräch vorbereitet';
    if (context.contextType === 'prevention_process' || category === 'prevention') return 'Prävention: Sachstand dokumentiert';
    if (context.contextType === 'sbv_participation') return 'Beteiligung: Stellungnahme vorbereitet';
    if (context.contextType === 'recruiting_participation') return 'Stellenbesetzung: SBV-Beteiligung nachgehalten';
    if (context.contextType === 'recruiting_interview') return 'Vorstellungsgespräch: SBV-Teilnahme dokumentiert';
    if (context.contextType === 'termination_hearing') return 'Kündigungsanhörung: Unterlagen geprüft';
    if (context.contextType === 'equalization_process') return 'Gleichstellung: Sachstand dokumentiert';
    if (context.contextType === 'sbv_control_protocol' || category === 'sbv_steering') return 'SBV-Steuerung: Ergebnis dokumentiert';
    if (context.contextType === 'deadline') return 'Frist: Ergebnis dokumentiert';
    if (category === 'consultation') return 'Beratung / Sprechstunde dokumentiert';
    if (category === 'employer_meeting') return 'Arbeitgebergespräch dokumentiert';
    if (category === 'committee_work') return 'BR-/Ausschussarbeit dokumentiert';
    if (category === 'research') return 'Recherche / Recht dokumentiert';
    if (category === 'qualification') return 'Schulung / Qualifizierung dokumentiert';
    if (category === 'external_network') return 'Externe Stelle: Abstimmung dokumentiert';
    if (category === 'sbv_self_organization') return 'SBV-Selbstorganisation dokumentiert';
    return context.title?.trim() || 'SBV-Tätigkeit dokumentiert';
  }
}
