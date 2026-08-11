import type { CaseProcessType } from './caseWorkbenchTypes';

export function requiresCaseProcessPrivacyReview(processType: CaseProcessType, status?: string): boolean {
  if (!status) return false;
  if (processType === 'bem') return ['abgeschlossen', 'abgebrochen', 'abgelehnt'].includes(status);
  return status === 'abgeschlossen';
}
