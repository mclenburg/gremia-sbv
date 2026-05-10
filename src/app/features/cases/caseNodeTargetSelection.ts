import type { CaseNodeTarget } from '../../core/navigation/caseNodeTarget';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';

export function shouldAutoSelectFirstCase({
  selectedCaseId,
  hasCases,
  hasTarget,
  hasPendingTarget
}: {
  selectedCaseId: string;
  hasCases: boolean;
  hasTarget: boolean;
  hasPendingTarget: boolean;
}): boolean {
  return !selectedCaseId && hasCases && !hasTarget && !hasPendingTarget;
}

export function selectionForCaseNodeTarget(
  target: CaseNodeTarget | null,
  caseId: string
): CaseExplorerSelection | null {
  if (!target) return null;
  if (target.caseId !== caseId) return { type: 'overview' };

  if (target.nodeType === 'prevention') return { type: 'process', processType: 'prevention', id: target.nodeId };
  if (target.nodeType === 'bem') return { type: 'process', processType: 'bem', id: target.nodeId };
  if (target.nodeType === 'equalization') return { type: 'process', processType: 'equalization', id: target.nodeId };
  if (target.nodeType === 'termination_hearing') return { type: 'process', processType: 'termination_hearing', id: target.nodeId };
  if (target.nodeType === 'participation') return { type: 'process', processType: 'participation', id: target.nodeId };
  if (target.nodeType === 'workplace_accommodation') return { type: 'process', processType: 'workplace_accommodation', id: target.nodeId };
  if (target.nodeType === 'note' && target.nodeId) return { type: 'note', id: target.nodeId };
  if (target.nodeType === 'document' && target.nodeId) return { type: 'document', id: target.nodeId };
  return { type: 'overview' };
}
