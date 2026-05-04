import type { CaseProcessType } from '../../features/cases/caseWorkbenchTypes';

export type CaseNodeTarget = {
  caseId: string;
  nodeType: CaseProcessType | 'overview' | 'note' | 'document' | 'deadline';
  nodeId?: string;
};
