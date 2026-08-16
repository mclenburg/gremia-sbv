import type { QuickCaseTemplate, QuickCaseTemplateKey } from '../src/app/core/models/sbv-office-workflow.model.js';
const templates: Record<QuickCaseTemplateKey, QuickCaseTemplate> = {
 additional_leave:{key:'additional_leave',title:'Zusatzurlaub',legalBasis:'§ 208 SGB IX',checklist:['Schwerbehindertenstatus und Urlaubsjahr prüfen','Arbeitgeberinformation dokumentieren','Urlaubsstand und Hinweisobliegenheiten prüfen','Ergebnis und Rückmeldung festhalten']},
 overtime:{key:'overtime',title:'Mehrarbeit',legalBasis:'§ 207 SGB IX',checklist:['Anordnung und zeitlichen Umfang erfassen','Schwerbehindertenstatus prüfen','Verlangen auf Freistellung von Mehrarbeit dokumentieren','Arbeitgeberreaktion festhalten']},
 qualification:{key:'qualification',title:'Qualifizierung',legalBasis:'§ 164 Abs. 4 Satz 1 Nr. 2 und 3 SGB IX',checklist:['Qualifizierungsbedarf erfassen','Behinderungsbedingte Barrieren benennen','Geeignete Maßnahme und Förderung prüfen','Umsetzung nachhalten']},
 working_time:{key:'working_time',title:'Arbeitszeit',legalBasis:'§ 164 Abs. 4 SGB IX',checklist:['Arbeitszeitliche Barriere erfassen','Geeignete Anpassung beschreiben','Arbeitgeberprüfung dokumentieren','Wirksamkeit nachhalten']},
 part_time:{key:'part_time',title:'Teilzeit',legalBasis:'§ 164 Abs. 5 Satz 3 SGB IX',checklist:['Notwendigkeit der kürzeren Arbeitszeit dokumentieren','Antrag und Zeitpunkt erfassen','Arbeitgeberreaktion prüfen','Umsetzung und Rückmeldung nachhalten']},
 discrimination_agg:{key:'discrimination_agg',title:'Benachteiligung / AGG',legalBasis:'§ 164 Abs. 2 SGB IX; AGG',checklist:['Benachteiligungssachverhalt datensparsam erfassen','Zeitpunkte und Vergleichssituation sichern','Arbeitgeberkontakt dokumentieren','Fristen und Ergebnis prüfen']},
 assistive_device:{key:'assistive_device',title:'Hilfsmittel',legalBasis:'§ 164 Abs. 4 Satz 1 Nr. 5 SGB IX',checklist:['Arbeitsbezogenen Bedarf beschreiben','Geeignetes Hilfsmittel benennen','Förderträger und Antrag prüfen','Beschaffung und Wirksamkeit nachhalten']},
};
export const QUICK_CASE_TEMPLATES: readonly QuickCaseTemplate[] = Object.values(templates);
export function getQuickCaseTemplate(key:QuickCaseTemplateKey):QuickCaseTemplate { return templates[key]; }
export function listQuickCaseTemplates():QuickCaseTemplate[] { return [...QUICK_CASE_TEMPLATES]; }
export function complaintCanClose(input:{resultSummary?:string; personInformedAt?:string}):boolean { return Boolean(input.resultSummary?.trim() && input.personInformedAt); }
