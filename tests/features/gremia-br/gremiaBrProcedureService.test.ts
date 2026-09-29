import { describe, expect, it, vi } from 'vitest';
import { GremiaBrProcedureService } from '../../../services/gremiaBr/gremiaBrProcedureService';

describe('Gremia.BR-Verfahrensdienst', () => {
  it('legt eine Informationsanforderung nur mit fachlich begrenzten Feldern an', async () => {
    const post = vi.fn().mockResolvedValue({
      id: 'request-2', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T12:00:00.000Z', version: 1,
      hidden: 'nicht übernehmen',
    });
    const service = new GremiaBrProcedureService({ post } as never);

    await expect(service.createInformationRequest('procedure-1', {
      items: 'Unterlage zur Arbeitsplatzgestaltung', reason: 'Für Stellungnahme', responseDueAt: '2026-10-05T10:00:00.000Z',
    })).resolves.toEqual({
      id: 'request-2', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T12:00:00.000Z', version: 1,
    });
    expect(post).toHaveBeenCalledWith('/api/v1/procedures/procedure-1/information-requests', {
      body: { items: 'Unterlage zur Arbeitsplatzgestaltung', reason: 'Für Stellungnahme', responseDueAt: '2026-10-05T10:00:00.000Z' },
    });
    await expect(service.createInformationRequest('procedure-1', { items: ' ' })).rejects.toThrow();
    expect(post).toHaveBeenCalledTimes(1);
  });

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
