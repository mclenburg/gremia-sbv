export interface VacationV5ScopeSelection {
  caseIds: readonly string[];
  standaloneDeadlineIds: readonly string[];
  meetingIds: readonly string[];
  recruitingIds: readonly string[];
  employerObligationIds: readonly string[];
  inclusionAgreementIds: readonly string[];
  violationIds: readonly string[];
  assemblyIds: readonly string[];
  inclusionOfficerSnapshotId?: string;
}

export interface VacationV5DeadlineReference {
  id: string;
  caseId: string | null;
  measureId: string | null;
  personId: string | null;
  processType: string;
  processId: string | null;
  status: string;
}

export type VacationV5ScopeIssueCode =
  | 'empty_scope' | 'duplicate_selection' | 'missing_deadline' | 'closed_deadline'
  | 'case_reference' | 'person_reference' | 'missing_parent' | 'excluded_process';

export interface VacationV5ScopeIssue {
  code: VacationV5ScopeIssueCode;
  entityId?: string;
}

const PARENT_SELECTION: Readonly<Record<string, keyof VacationV5ScopeSelection>> = {
  sbv_meeting: 'meetingIds',
  recruiting_participation: 'recruitingIds',
  employer_obligation_review: 'employerObligationIds',
  inclusion_agreement: 'inclusionAgreementIds',
  sbv_participation_violation: 'violationIds',
  sbv_assembly: 'assemblyIds',
};

const SELECTION_KEYS = [
  'caseIds', 'standaloneDeadlineIds', 'meetingIds', 'recruitingIds',
  'employerObligationIds', 'inclusionAgreementIds', 'violationIds', 'assemblyIds',
] as const;

export function inspectVacationV5Scope(selection: VacationV5ScopeSelection,
  deadlines: readonly VacationV5DeadlineReference[]): { selectedCount: number; issues: VacationV5ScopeIssue[] } {
  const issues: VacationV5ScopeIssue[] = [];
  const selectedCount = SELECTION_KEYS.reduce((count, key) => count + selection[key].length, selection.inclusionOfficerSnapshotId ? 1 : 0);
  if (!selectedCount) issues.push({ code: 'empty_scope' });
  for (const key of SELECTION_KEYS) {
    const ids = selection[key];
    if (ids.some((id) => !id || typeof id !== 'string') || new Set(ids).size !== ids.length) {
      issues.push({ code: 'duplicate_selection' });
      break;
    }
  }
  const byId = new Map(deadlines.map((deadline) => [deadline.id, deadline]));
  for (const id of selection.standaloneDeadlineIds) {
    const deadline = byId.get(id);
    if (!deadline) { issues.push({ code: 'missing_deadline', entityId: id }); continue; }
    if (deadline.caseId || deadline.measureId) { issues.push({ code: 'case_reference', entityId: id }); continue; }
    if (deadline.personId) { issues.push({ code: 'person_reference', entityId: id }); continue; }
    if (!['open', 'overdue', 'suspended'].includes(deadline.status)) { issues.push({ code: 'closed_deadline', entityId: id }); continue; }
    const parentKey = PARENT_SELECTION[deadline.processType];
    if (parentKey) {
      const parents = selection[parentKey];
      if (!deadline.processId || !Array.isArray(parents) || !parents.includes(deadline.processId)) {
        issues.push({ code: 'missing_parent', entityId: id });
      }
    } else if (!['custom', 'case'].includes(deadline.processType) || deadline.processId) {
      issues.push({ code: 'excluded_process', entityId: id });
    }
  }
  return { selectedCount, issues };
}
