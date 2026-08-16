import type { PersonImportColumnMapping, PersonImportPreviewInput, PersonImportPreviewResult } from '../../core/models/protected-person.model';
import { buildDefaultPersonImportMapping, personImportFieldOptions, type PersonImportFieldKey, updatePersonImportColumnMapping } from '../../shared/import/personImportMapping';

export const importFieldOptions = personImportFieldOptions;
export type ImportFieldKey = PersonImportFieldKey;
export type ImportSource = { sourceFileName: string; fileType: 'csv' | 'xlsx'; filePath?: string; csvText?: string; csvEncoding?: PersonImportPreviewInput['csvEncoding'] };
export type ImportStep = 'source' | 'preview' | 'mapping' | 'validate' | 'result';

export function toInputDate(value?: string): string {
  return value?.slice(0, 10) ?? '';
}

export function buildDefaultMapping(columns: string[] = []): PersonImportColumnMapping {
  return buildDefaultPersonImportMapping(columns);
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

export function updateColumnMapping(mapping: PersonImportColumnMapping, key: ImportFieldKey, value: string): PersonImportColumnMapping {
  return updatePersonImportColumnMapping(mapping, key, value);
}
