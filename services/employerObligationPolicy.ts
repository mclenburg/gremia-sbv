import type { EmployerObligationKey, ObligationStatus } from '../src/app/core/models/sbv-office-workflow.model.js';

export const EMPLOYER_OBLIGATION_POLICY: Record<EmployerObligationKey, { cadence:string; legalBasis:string; title:string }> = {
  employment_report_163_2: { cadence:'annual', legalBasis:'§ 163 Abs. 2 SGB IX', title:'Anzeige und Verzeichnis' },
  employment_quota_154: { cadence:'annual', legalBasis:'§ 154 SGB IX', title:'Beschäftigungsquote' },
  vacancy_review_164_1: { cadence:'continuous', legalBasis:'§ 164 Abs. 1 SGB IX', title:'Prüfung freier Arbeitsplätze' },
  prevention_167: { cadence:'annual', legalBasis:'§ 167 SGB IX', title:'Prävention und BEM' },
  inclusion_officer_181: { cadence:'continuous', legalBasis:'§ 181 SGB IX', title:'Inklusionsbeauftragter' },
  inclusion_agreement_166: { cadence:'annual', legalBasis:'§ 166 SGB IX', title:'Inklusionsvereinbarung' },
  sbv_election_result_notification_163_8: { cadence:'event', legalBasis:'§ 163 Abs. 8 SGB IX', title:'Mitteilung des Wahlergebnisses' },
};

export function annualReportDueAt(periodYear:number): string { return `${periodYear + 1}-03-31T23:59:59.000Z`; }
export function deriveAnnualReportStatus(periodYear:number, now:Date, receivedAt?:string): ObligationStatus {
  if (receivedAt) return 'received';
  return now.getTime() > new Date(annualReportDueAt(periodYear)).getTime() ? 'due' : 'not_due';
}
export function inclusionOfficerFinding(status:string): 'open'|'ok'|'unknown' {
  if (status === 'not_appointed') return 'open';
  if (status === 'appointed') return 'ok';
  return 'unknown';
}
