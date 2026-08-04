import { describe, expect, it, vi } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService.js';
import type { PersonalDataAuditLogService } from '../services/auditLogService.js';
import { MeasureLifecycleAuditService } from '../services/measureLifecycleAuditService.js';

describe('MeasureLifecycleAuditService dependency injection', () => {
  it('uses the injected audit service without constructing or accessing another database service', () => {
    const append = vi.fn();
    const audit = { append } as unknown as PersonalDataAuditLogService;
    const database = new Proxy({}, {
      get() {
        throw new Error('Database access is not expected while the injected audit service handles the write.');
      },
    }) as DatabaseAdapter;

    const service = new MeasureLifecycleAuditService(database, audit);
    service.created('bem', 'measure-1', 'case-1', 'zu_pruefen', 'manual');

    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      subjectType: 'measure_lifecycle',
      subjectId: 'measure-1',
      caseId: 'case-1',
      metadata: expect.objectContaining({
        schemaVersion: '1',
        eventName: 'created',
        measureType: 'bem',
      }),
    }));
  });
});
