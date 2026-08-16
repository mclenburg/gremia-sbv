import { describe, expect, it, vi } from 'vitest';
import type { DatabaseAdapter } from '../../services/databaseService.js';
import {
  CASE_LIFECYCLE_SCHEMA_VERSION,
  CASE_LIFECYCLE_SUBJECT_TYPE,
  CaseLifecycleAuditService,
} from '../../services/caseLifecycleAuditService.js';
import { normalizeAuditMetadata } from '../../services/auditHashChain.js';

const unusedDatabase = {} as DatabaseAdapter;

describe('CaseLifecycleAuditService', () => {
  it('writes exactly one privacy-safe chained event for a hard-deleted case', () => {
    const append = vi.fn();
    const service = new CaseLifecycleAuditService(unusedDatabase, { append });

    service.deleted({
      caseId: 'case-42',
      deletedMeasureCount: 3,
      deletedDocumentCount: 2,
      affectedFileCount: 4,
    });

    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith({
      action: 'delete',
      subjectType: CASE_LIFECYCLE_SUBJECT_TYPE,
      subjectId: 'case-42',
      caseId: 'case-42',
      purpose: 'Fallakte endgültig gelöscht',
      metadata: {
        schemaVersion: CASE_LIFECYCLE_SCHEMA_VERSION,
        eventName: 'deleted',
        deletionMode: 'hard_delete',
        deletedMeasureCount: 3,
        deletedDocumentCount: 2,
        affectedFileCount: 4,
      },
    });

    const serialized = JSON.stringify(append.mock.calls[0]?.[0]);
    expect(serialized).not.toContain('caseNumber');
    expect(serialized).not.toContain('reason');
    expect(serialized).not.toContain('displayName');
  });

  it('normalizes counters and preserves all approved case-lifecycle metadata in the chain payload', () => {
    const append = vi.fn();
    const service = new CaseLifecycleAuditService(unusedDatabase, { append });

    service.deleted({
      caseId: 'case-7',
      deletedMeasureCount: -3,
      deletedDocumentCount: 2.9,
      affectedFileCount: Number.NaN,
    });

    const input = append.mock.calls[0]?.[0];
    expect(input?.metadata).toEqual({
      schemaVersion: 1,
      eventName: 'deleted',
      deletionMode: 'hard_delete',
      deletedMeasureCount: 0,
      deletedDocumentCount: 2,
      affectedFileCount: 0,
    });
    expect(JSON.parse(normalizeAuditMetadata(input?.metadata, 'case'))).toEqual({
      affectedFileCount: 0,
      deletedDocumentCount: 2,
      deletedMeasureCount: 0,
      deletionMode: 'hard_delete',
      eventName: 'deleted',
      schemaVersion: 1,
    });
  });
});
