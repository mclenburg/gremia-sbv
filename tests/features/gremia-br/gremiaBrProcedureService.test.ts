import { describe, expect, it, vi } from 'vitest';
import { GremiaBrProcedureService } from '../../../services/gremiaBr/gremiaBrProcedureService';

describe('Gremia.BR-Verfahrensdienst', () => {
  it('liest Informationsanforderungen erst beim Aufruf und minimiert die Antwort', async () => {
    const get = vi.fn().mockResolvedValue([{
      id: 'request-1', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T10:00:00.000Z',
      responseDueAt: '2026-10-05T10:00:00.000Z', version: 2, confidential: 'nicht übernehmen',
    }]);
    const service = new GremiaBrProcedureService({ get } as never);

    expect(get).not.toHaveBeenCalled();
    expect(await service.listInformationRequests('procedure-1')).toEqual([{
      id: 'request-1', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T10:00:00.000Z',
      responseDueAt: '2026-10-05T10:00:00.000Z', version: 2,
    }]);
    expect(get).toHaveBeenCalledWith('/api/v1/procedures/procedure-1/information-requests');
  });
});
