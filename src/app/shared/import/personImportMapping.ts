import type { PersonImportColumnMapping } from '../../core/models/protected-person.model';

export const personImportFieldOptions = [
  { key: 'fullName', label: 'Vollname' },
  { key: 'firstName', label: 'Vorname' },
  { key: 'lastName', label: 'Nachname' },
  { key: 'protectionStatus', label: 'Schutzstatus' },
  { key: 'statusValidUntil', label: 'Status gültig bis' },
  { key: 'workEmail', label: 'Dienstliche E-Mail' },
  { key: 'personnelNumber', label: 'Personalnummer' },
  { key: 'organizationalUnit', label: 'Organisationseinheit' },
  { key: 'location', label: 'Standort' },
  { key: 'leftCompanyAt', label: 'Beschäftigungsende' },
] as const;

export type PersonImportFieldKey = (typeof personImportFieldOptions)[number]['key'];

export function buildDefaultPersonImportMapping(columns: string[] = []): PersonImportColumnMapping {
  const pick = (...patterns: RegExp[]) => columns.find((column) => patterns.some((pattern) => pattern.test(column))) ?? '';
  const nameColumn = pick(/^name$/i, /vollname/i, /nachname.*vorname/i);
  return {
    fullName: nameColumn,
    fullNameMode: 'last_comma_first',
    firstName: nameColumn ? '' : pick(/vorname/i),
    lastName: nameColumn ? '' : pick(/nachname/i),
    personnelNumber: pick(/personal/i, /pers.*nr/i),
    workEmail: pick(/e-?mail/i, /mail/i),
    organizationalUnit: pick(/organisation/i, /bereich/i, /abteilung/i),
    location: pick(/standort/i, /ort/i),
    protectionStatus: pick(/status/i, /schutz/i),
    statusValidUntil: pick(/gültig bis/i, /gueltig bis/i, /befrist/i),
    leftCompanyAt: pick(/beschäftigungsende/i, /beschaeftigungsende/i, /austritt/i),
  };
}

export function updatePersonImportColumnMapping(
  mapping: PersonImportColumnMapping,
  key: PersonImportFieldKey,
  value: string,
): PersonImportColumnMapping {
  const nextMapping = { ...mapping, [key]: value || undefined };
  if (key === 'fullName' && value) {
    nextMapping.firstName = '';
    nextMapping.lastName = '';
  }
  if ((key === 'firstName' || key === 'lastName') && value) nextMapping.fullName = '';
  return nextMapping;
}
