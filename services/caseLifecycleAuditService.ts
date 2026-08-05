import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';

export const CASE_LIFECYCLE_SUBJECT_TYPE = 'case' as const;
export const CASE_LIFECYCLE_SCHEMA_VERSION = 1 as const;

export interface CaseDeletionAuditInput {
  caseId: string;
  deletedMeasureCount: number;
  deletedDocumentCount: number;
  affectedFileCount: number;
}

type CaseAuditWriter = Pick<PersonalDataAuditLogService, 'append'>;

function nonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/**
 * Writes privacy-safe lifecycle events for case records.
 * No case number, title, reason or other free text is persisted in the hash chain.
 */
export class CaseLifecycleAuditService {
  private readonly audit: CaseAuditWriter;

  constructor(db: DatabaseAdapter, audit?: CaseAuditWriter) {
    this.audit = audit ?? new PersonalDataAuditLogService(db);
  }

  deleted(input: CaseDeletionAuditInput): void {
    this.audit.append({
      action: 'delete',
      subjectType: CASE_LIFECYCLE_SUBJECT_TYPE,
      subjectId: input.caseId,
      caseId: input.caseId,
      purpose: 'Fallakte endgültig gelöscht',
      metadata: {
        schemaVersion: CASE_LIFECYCLE_SCHEMA_VERSION,
        eventName: 'deleted',
        deletionMode: 'hard_delete',
        deletedMeasureCount: nonNegativeInteger(input.deletedMeasureCount),
        deletedDocumentCount: nonNegativeInteger(input.deletedDocumentCount),
        affectedFileCount: nonNegativeInteger(input.affectedFileCount),
      },
    });
  }
}
