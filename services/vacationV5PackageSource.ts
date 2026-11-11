import { VACATION_V5_CASE_ROW_FIELDS } from './vacationV5CaseRowPolicy.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';

export type VacationV5PackageSourceKind = keyof typeof VACATION_V5_CASE_ROW_FIELDS
  | keyof typeof VACATION_V5_ROW_FIELDS | 'case_deadline';
export type VacationV5PackageSourceByRef = Record<string, {
  kind: VacationV5PackageSourceKind; localId: string; baselineSha256: string;
}>;

export function vacationV5SourceTable(kind: VacationV5PackageSourceKind): string {
  if (kind === 'case_deadline') return VACATION_V5_ROW_FIELDS.deadline.table;
  if (Object.hasOwn(VACATION_V5_CASE_ROW_FIELDS, kind)) {
    return VACATION_V5_CASE_ROW_FIELDS[kind as keyof typeof VACATION_V5_CASE_ROW_FIELDS].table;
  }
  return VACATION_V5_ROW_FIELDS[kind as keyof typeof VACATION_V5_ROW_FIELDS].table;
}
