import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';

export interface CaseDeletionTransactionSteps {
  deleteDependentData(): void;
  appendMandatoryCaseAudit(): void;
  deleteCaseRecord(): void;
  recordRetentionAction(): void;
}

/**
 * Defines the mandatory order for a case hard-delete.
 * Reconstructable projections and file-system cleanup are deliberately outside this boundary.
 */
export function runCaseDeletionTransaction(
  db: DatabaseAdapter,
  steps: CaseDeletionTransactionSteps,
): void {
  new DatabaseUnitOfWork(db).run(() => {
    steps.deleteDependentData();
    steps.appendMandatoryCaseAudit();
    steps.deleteCaseRecord();
    steps.recordRetentionAction();
  });
}
