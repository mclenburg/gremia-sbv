import type { DataProtectionNoticeInput } from '../models/compliance.model.js';
import type { TemplateDefaultValues } from '../models/template-default.model.js';

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

export function dataProtectionNoticeDefaults(defaults: TemplateDefaultValues, date: string): DataProtectionNoticeInput {
  return {
    responsibleEntity: defaults['datenschutz.verantwortliche_stelle'] || defaults['arbeitgeber.name'] || defaults['unternehmen.name'],
    responsibleContact: [defaults['datenschutz.kontakt.name'], defaults['datenschutz.kontakt.email']].filter(Boolean).join(' · '),
    sbvContact: [defaults['sbv.name'] === 'Schwerbehindertenvertretung' ? '' : defaults['sbv.name'], defaults['sbv.email'], defaults['sbv.telefon']].filter(Boolean).join(' · '),
    privacyOfficerContact: [defaults['datenschutz.dsb.name'], defaults['datenschutz.dsb.email']].filter(Boolean).join(' · '),
    legalBasis: '',
    dataSources: '',
    recipients: '',
    retention: '',
    thirdCountryTransfers: '',
    supervisoryAuthority: '',
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

Die ${value('responsibleEntity')} informiert Sie gemäß Art. 13 und 14 DSGVO über die Verarbeitung Ihrer personenbezogenen Daten im Rahmen der Aufgaben der Schwerbehindertenvertretung (SBV).

## Verantwortliche Stelle und Kontakt

${value('responsibleEntity')} · ${value('responsibleContact')}

Schwerbehindertenvertretung: ${value('sbvContact')}
${input.privacyOfficerContact.trim() ? `\nDatenschutzbeauftragte oder Datenschutzbeauftragter: ${value('privacyOfficerContact')}\n` : ''}
## Zwecke und Datenarten

Die SBV verarbeitet die für Beratung, Unterstützung, Beteiligung und Interessenvertretung erforderlichen Daten. Dazu können Kontaktdaten, Angaben zum Beschäftigungsverhältnis, zur Schwerbehinderung oder Gleichstellung, Gesundheitsangaben, Gesprächsnotizen, Vorgänge, Fristen und Dokumente gehören. Die Daten werden elektronisch in einer lokal betriebenen, verschlüsselten Anwendung gespeichert.

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
