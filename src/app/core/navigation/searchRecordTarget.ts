import type { UnifiedSearchHit } from '../../../domain/models/unified-search.model';
import type { DeadlineOpenTarget } from '../../features/deadlines/deadlineContext';
import type { CaseNodeTarget } from './caseNodeTarget';
import type { CaseProcessType } from '../../features/cases/caseWorkbenchTypes';

export type SearchRecordTarget =
  | Extract<DeadlineOpenTarget, { kind: 'record' | 'deadline' }>
  | { kind: 'person' | 'contact'; id: string };

const processTypeBySource: Partial<Record<string, CaseProcessType>> = {
  bem: 'bem', bem_event: 'bem', prevention: 'prevention', prevention_event: 'prevention',
  termination: 'termination_hearing', equalization: 'equalization', participation: 'participation',
  participation_event: 'participation', workplace_accommodation: 'workplace_accommodation',
};

export function resolveSearchCaseNodeTarget(hit: UnifiedSearchHit): CaseNodeTarget | null {
  if (!hit.caseId) return null;
  const nodeId = hit.navigationId || hit.sourceId;
  if (hit.navigationKind === 'case') return { caseId: hit.caseId, nodeType: 'overview' };
  if (hit.navigationKind === 'note' || hit.navigationKind === 'document') {
    return { caseId: hit.caseId, nodeType: hit.navigationKind, nodeId };
  }
  const processType = processTypeBySource[hit.sourceType];
  if (hit.navigationKind === 'process' && processType) return { caseId: hit.caseId, nodeType: processType, nodeId };
  return null;
}

export function resolveSearchRecordTarget(hit: UnifiedSearchHit): SearchRecordTarget | null {
  const id = hit.navigationId || hit.sourceId;
  switch (hit.sourceType) {
    case 'person': return { kind: 'person', id };
    case 'contact': return { kind: 'contact', id };
    case 'legal_norm': return { kind: 'record', view: 'knowledge', recordId: id };
    case 'template': return { kind: 'record', view: 'templates', recordId: id };
    case 'journal': return { kind: 'record', view: 'activity_journal', recordId: id };
    case 'participation_violation': return { kind: 'record', view: 'participation_violations', recordId: id };
    case 'recruiting': return { kind: 'record', view: 'recruiting_participations', recordId: id };
    case 'election': return { kind: 'record', view: 'elections', recordId: id };
    case 'control_protocol': return { kind: 'record', view: 'sbv_control', processType: 'sbv_control_protocol', recordId: id };
    case 'meeting': return { kind: 'record', view: 'meetings', processType: 'sbv_meeting', recordId: id };
    case 'assembly': return { kind: 'record', view: 'sbv_control', processType: 'sbv_assembly', recordId: id };
    case 'employer_obligation': return { kind: 'record', view: 'sbv_control', processType: 'employer_obligation_review', recordId: id };
    case 'inclusion_agreement': return { kind: 'record', view: 'sbv_control', processType: 'inclusion_agreement', recordId: id };
    case 'deadline': return { kind: 'deadline', deadlineId: id };
    default: return null;
  }
}
