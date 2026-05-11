import type { PersonImportColumnMapping, PersonImportPreviewInput, PersonImportPreviewResult } from '../../core/models/protected-person.model';

export const importFieldOptions = [
  { key: 'fullName', label: 'Vollname' },
  { key: 'firstName', label: 'Vorname' },
  { key: 'lastName', label: 'Nachname' },
  { key: 'protectionStatus', label: 'Schutzstatus' },
  { key: 'statusValidUntil', label: 'Status gültig bis' },
  { key: 'workEmail', label: 'Dienstliche E-Mail' },
  { key: 'personnelNumber', label: 'Personalnummer' },
  { key: 'organizationalUnit', label: 'Organisationseinheit' },
  { key: 'location', label: 'Standort' },
  { key: 'leftCompanyAt', label: 'Beschäftigungsende' }
] as const;

export type ImportFieldKey = (typeof importFieldOptions)[number]['key'];
export type ImportSource = { sourceFileName: string; fileType: 'csv' | 'xlsx'; filePath?: string; csvText?: string; csvEncoding?: PersonImportPreviewInput['csvEncoding'] };
export type ImportStep = 'source' | 'preview' | 'mapping' | 'validate' | 'result';

export function toInputDate(value?: string): string {
  return value?.slice(0, 10) ?? '';
}

export function buildDefaultMapping(columns: string[] = []): PersonImportColumnMapping {
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
    leftCompanyAt: pick(/beschäftigungsende/i, /beschaeftigungsende/i, /austritt/i)
  };
}

export function hasMappedName(mapping: PersonImportColumnMapping): boolean {
  return Boolean(mapping.fullName || (mapping.firstName && mapping.lastName));
}

export function countRowsWithErrors(preview?: PersonImportPreviewResult | null): number {
  return preview?.rows.filter((row) => row.validationErrors.length > 0).length ?? 0;
}

export function createPreviewInput(source: ImportSource, mapping: PersonImportColumnMapping): PersonImportPreviewInput {
  return {
    sourceFileName: source.sourceFileName,
    fileType: source.fileType,
    filePath: source.filePath,
    csvText: source.csvText,
    csvEncoding: source.csvEncoding ?? 'auto',
    delimiter: ';',
    headerRowIndex: 0,
    firstDataRowIndex: 1,
    mapping
  };
}

export function updateColumnMapping(
  mapping: PersonImportColumnMapping,
  key: ImportFieldKey,
  value: string
): PersonImportColumnMapping {
  const nextMapping = { ...mapping, [key]: value || undefined };
  if (key === 'fullName' && value) {
    nextMapping.firstName = '';
    nextMapping.lastName = '';
  }
  if ((key === 'firstName' || key === 'lastName') && value) {
    nextMapping.fullName = '';
  }
  return nextMapping;
}
