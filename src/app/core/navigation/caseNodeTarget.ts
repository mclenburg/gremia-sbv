import type { CaseProcessType } from '../../features/cases/caseWorkbenchTypes';

export type CaseNodeTarget = {
  caseId: string;
  nodeType: CaseProcessType | 'note' | 'document' | 'deadline';
  nodeId?: string;
};
