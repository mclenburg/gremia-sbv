import { VACATION_V5_CASE_ROW_FIELDS } from './vacationV5CaseRowPolicy.js';
import { VACATION_V5_ROW_FIELDS } from './vacationV5RowPolicy.js';

export type VacationV5PackageSourceKind = keyof typeof VACATION_V5_CASE_ROW_FIELDS
  | keyof typeof VACATION_V5_ROW_FIELDS | 'case_deadline'
  | 'generated_document' | 'workflow_document_link' | 'violation_document_link';
export type VacationV5PackageSourceByRef = Record<string, {
  kind: VacationV5PackageSourceKind; localId: string; baselineSha256: string;
}>;

export function isVacationV5PackageSourceKind(kind: string): kind is VacationV5PackageSourceKind {
  return kind === 'case_deadline' || kind === 'generated_document' || kind === 'workflow_document_link'
    || kind === 'violation_document_link' || Object.hasOwn(VACATION_V5_CASE_ROW_FIELDS, kind)
    || Object.hasOwn(VACATION_V5_ROW_FIELDS, kind);
}

export function vacationV5SourceTable(kind: VacationV5PackageSourceKind): string {
  if (kind === 'case_deadline') return VACATION_V5_ROW_FIELDS.deadline.table;
  if (kind === 'generated_document') return 'generated_documents';
  if (kind === 'workflow_document_link') return 'sbv_workflow_document_links';
  if (kind === 'violation_document_link') return 'sbv_participation_violation_documents';
  if (Object.hasOwn(VACATION_V5_CASE_ROW_FIELDS, kind)) {
    return VACATION_V5_CASE_ROW_FIELDS[kind as keyof typeof VACATION_V5_CASE_ROW_FIELDS].table;
  }
  return VACATION_V5_ROW_FIELDS[kind as keyof typeof VACATION_V5_ROW_FIELDS].table;
}
