import type { DataProtectionNoticeInput } from '../models/compliance.model.js';
import type { TemplateDefaultValues } from '../models/template-default.model.js';
import type { RetentionRule, RetentionSettings } from '../models/retention.model.js';
import { retentionPolicyDefinitionsWithRules } from '../retention/retentionPolicyCatalog.js';
import { DATA_SUBJECT_ACCESS_SOURCES } from './dataSubjectAccessPolicy.js';

const REQUIRED_FIELDS: Array<[keyof DataProtectionNoticeInput, string]> = [
  ['responsibleEntity', 'Verantwortliche Stelle'],
  ['responsibleContact', 'Kontakt der verantwortlichen Stelle'],
  ['sbvContact', 'Kontakt der Schwerbehindertenvertretung'],
  ['legalBasis', 'Rechtsgrundlagen'],
  ['dataSources', 'Herkunft der Daten'],
  ['recipients', 'Empfänger'],
  ['retention', 'Speicherdauer'],
  ['thirdCountryTransfers', 'Drittlandübermittlung'],
  ['supervisoryAuthority', 'Datenschutzaufsichtsbehörde'],
  ['issueDate', 'Datum'],
];

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function reviewPeriod(rule: RetentionRule): string {
  if (rule.kind === 'months_after_completion') return `${rule.months} Monate nach Abschluss`;
  if (rule.kind === 'months_after_completion_year_end') return `${rule.months} Monate ab Jahresende des Abschlusses`;
  if (rule.kind === 'term_related') return `amtszeitbezogen nach ${rule.months} Monaten`;
  if (rule.kind === 'permanent_anonymized') return 'dauerhaft nur anonymisiert';
  return 'nach Wegfall des Zwecks';
}

function retentionInformation(settings?: RetentionSettings): string {
  const criteria = 'Die Daten werden gespeichert, solange der jeweilige SBV-Zweck, ein laufender Vorgang oder gesetzliche Nachweis- und Aufbewahrungspflichten dies erfordern. Nach Zweckfortfall werden personenbezogene Inhalte auf Löschung oder Anonymisierung geprüft; die Anwendung nimmt keine automatische Löschung vor.';
  if (!settings) return criteria;
  const periods = retentionPolicyDefinitionsWithRules(settings.moduleRules)
    .map(({ label, rule }) => `${label}: Prüfung ${reviewPeriod(rule)}`)
    .join('; ');
  return `${criteria} Die in Gremia.SBV eingestellten regulären Prüftermine lauten: ${periods}. Im Einzelfall können laufende Verfahren und gesetzliche Pflichten eine abweichende Dauer erfordern.`;
}

function processedDataAndPurposes(): string {
  return DATA_SUBJECT_ACCESS_SOURCES.map((source) =>
    `- ${source.label}: ${source.dataCategories.join(', ')}. Zweck: ${source.purposes.join('; ')}.`,
  ).join('\n');
}

export function dataProtectionNoticeDefaults(defaults: TemplateDefaultValues, date: string, retentionSettings?: RetentionSettings): DataProtectionNoticeInput {
  return {
    responsibleEntity: defaults['datenschutz.verantwortliche_stelle'] || defaults['arbeitgeber.name'] || defaults['unternehmen.name'],
    responsibleContact: [defaults['datenschutz.kontakt.name'], defaults['datenschutz.kontakt.email']].filter(Boolean).join(' · '),
    sbvContact: [defaults['sbv.name'] === 'Schwerbehindertenvertretung' ? '' : defaults['sbv.name'], defaults['sbv.email'], defaults['sbv.telefon']].filter(Boolean).join(' · '),
    privacyOfficerContact: [defaults['datenschutz.dsb.name'], defaults['datenschutz.dsb.email']].filter(Boolean).join(' · '),
    legalBasis: 'Rechtsgrundlage der zur gesetzlichen SBV-Aufgabe erforderlichen Verarbeitung ist Art. 6 Abs. 1 Buchst. c DSGVO in Verbindung mit § 178 SGB IX. Für erforderliche Angaben über Behinderung und Gesundheit gilt Art. 9 Abs. 2 Buchst. b DSGVO in Verbindung mit § 26 Abs. 3 BDSG, soweit diese Norm auf die verantwortliche Stelle anwendbar ist. Bei Prävention und BEM gelten ergänzend § 167 Abs. 1 und 2 SGB IX.',
    dataSources: 'Die Daten stammen von Ihnen selbst, aus von Ihnen vorgelegten Nachweisen und Unterlagen, aus erforderlichen Mitteilungen und Listen des Arbeitgebers sowie aus der Dokumentation der SBV. Je nach Verfahren können Angaben beteiligter Behörden oder anderer Stellen hinzukommen. Eine automatische Übernahme aus öffentlich zugänglichen Quellen erfolgt nicht.',
    recipients: 'Zugriff haben die zuständige Schwerbehindertenvertretung und zulässig einbezogene Stellvertretungen. Je nach Vorgang können erforderliche Informationen nach rechtlicher Prüfung an die betroffene Person, zuständige Arbeitgeberstellen, Betriebs- oder Personalrat, Inklusionsamt, Agentur für Arbeit oder andere am Verfahren beteiligte Stellen weitergegeben werden. Die Anwendung versendet personenbezogene Fallinhalte nicht automatisch; Exporte und optionale externe Anbindungen werden bewusst ausgelöst.',
    retention: retentionInformation(retentionSettings),
    thirdCountryTransfers: defaults['datenschutz.drittlandangabe'] || 'Eine Übermittlung personenbezogener Daten an Empfänger in Drittländern oder internationale Organisationen findet nicht statt.',
    supervisoryAuthority: defaults['datenschutz.aufsichtsbehoerde'],
    issueDate: date,
  };
}

export function validateDataProtectionNotice(input: DataProtectionNoticeInput): string[] {
  if (!input || typeof input !== 'object') return ['Angaben zur Datenschutzinformation'];
  const missing = REQUIRED_FIELDS.filter(([key]) => typeof input[key] !== 'string' || !clean(input[key])).map(([, label]) => label);
  const issueDate = typeof input.issueDate === 'string' ? input.issueDate : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(issueDate) ? new Date(`${issueDate}T12:00:00Z`) : null;
  if (issueDate && (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== issueDate)) missing.push('Gültiges Datum');
  for (const [key, label] of [...REQUIRED_FIELDS, ['privacyOfficerContact', 'Datenschutzkontakt'] as const]) {
    const value = input[key];
    if (typeof value !== 'string' || /\[[^\]]+\]|\{\{[^}]+\}\}/.test(value)) missing.push(`${label} ohne Platzhalter`);
  }
  return missing;
}

export function renderDataProtectionNotice(input: DataProtectionNoticeInput): string {
  const missing = validateDataProtectionNotice(input);
  if (missing.length) throw new Error(`Datenschutzinformation: Bitte ${missing.join(', ')} ergänzen.`);
  const date = new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${input.issueDate}T12:00:00Z`));
  const value = (key: keyof DataProtectionNoticeInput) => clean(input[key]);
  return `${date}

Diese Information erläutert gemäß Art. 13 und 14 DSGVO die Verarbeitung Ihrer personenbezogenen Daten im Rahmen der Aufgaben der Schwerbehindertenvertretung (SBV).

## Verantwortliche Stelle und Kontakt

${value('responsibleEntity')} · ${value('responsibleContact')}

Schwerbehindertenvertretung: ${value('sbvContact')}
${input.privacyOfficerContact.trim() ? `\nDatenschutzbeauftragte oder Datenschutzbeauftragter: ${value('privacyOfficerContact')}\n` : ''}
## Zwecke und Datenarten

Die SBV verarbeitet nur die für Beratung, Unterstützung, Beteiligung und Interessenvertretung erforderlichen Daten. Je nach Anliegen und genutztem Arbeitsbereich können folgende Datenarten und Zwecke betroffen sein:

${processedDataAndPurposes()}

Angaben zur Gesundheit oder Behinderung werden nur verarbeitet, soweit sie für den konkreten SBV-Zweck erforderlich sind. Die Daten werden elektronisch in einer lokal betriebenen, verschlüsselten Anwendung gespeichert.

## Rechtsgrundlagen

${value('legalBasis')}

## Herkunft der Daten

${value('dataSources')}

## Empfänger und Drittlandübermittlung

${value('recipients')}

${value('thirdCountryTransfers')}

## Speicherdauer

${value('retention')}

## Ihre Rechte und Beschwerderecht

Sie können nach Maßgabe der DSGVO Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und gegebenenfalls Widerspruch verlangen. Wenden Sie sich dazu an die oben genannte verantwortliche Stelle oder den Datenschutzkontakt. Sie haben außerdem das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren: ${value('supervisoryAuthority')}.

## Erforderlichkeit der Angaben und automatisierte Entscheidungen

Welche Angaben für ein Anliegen erforderlich sind, hängt vom jeweiligen Vorgang ab. Sie können die SBV zunächst auch ohne vollständige Angaben kontaktieren. Eine ausschließlich automatisierte Entscheidung im Sinne des Art. 22 DSGVO findet im Rahmen dieser Verarbeitung nicht statt.`;
}
