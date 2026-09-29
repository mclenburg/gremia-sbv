import { describe, expect, it, vi } from 'vitest';
import { GremiaBrProcedureService } from '../../../services/gremiaBr/gremiaBrProcedureService';

describe('Gremia.BR-Verfahrensdienst', () => {
  it('legt eine eigene Verfahrensaufgabe mit der aktuellen Serveridentität an', async () => {
    const get = vi.fn().mockResolvedValue({ userId: 'person-1' });
    const post = vi.fn().mockResolvedValue({
      id: 'task-1', title: 'Stellungnahme vorbereiten', status: 'OPEN', version: 1,
      subjectType: 'PROCEDURE', subjectId: 'procedure-1', description: 'Vertraulicher Volltext',
    });
    const service = new GremiaBrProcedureService({ get, post } as never);

    expect(await service.createOwnTask('procedure-1', { title: 'Stellungnahme vorbereiten' })).toEqual({
      id: 'task-1', title: 'Stellungnahme vorbereiten', status: 'OPEN', version: 1, subjectType: 'PROCEDURE',
    });
    expect(get).toHaveBeenCalledWith('/api/v1/auth/session');
    expect(post).toHaveBeenCalledWith('/api/v1/procedures/procedure-1/tasks', {
      body: { title: 'Stellungnahme vorbereiten', assignments: [{ kind: 'PERSON', reference: 'person-1', role: 'RESPONSIBLE' }] },
    });
    expect(JSON.stringify(post.mock.calls)).not.toContain('Vertraulicher Volltext');
  });

  it('schließt nur eine noch offene Anforderung mit bestätigter aktueller Version ab', async () => {
    const get = vi.fn().mockResolvedValue([{
      id: 'request-1', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T10:00:00.000Z', version: 3,
    }]);
    const post = vi.fn().mockResolvedValue({
      id: 'request-1', procedureId: 'procedure-1', status: 'FULFILLED', requestedAt: '2026-09-29T10:00:00.000Z', version: 4,
    });
    const service = new GremiaBrProcedureService({ get, post } as never);

    await expect(service.completeInformationRequest('procedure-1', 'request-1', 2)).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
    expect(await service.completeInformationRequest('procedure-1', 'request-1', 3)).toMatchObject({ status: 'FULFILLED', version: 4 });
    expect(post).toHaveBeenCalledWith('/api/v1/procedures/information-requests/request-1/resolve', {
      body: { to: 'FULFILLED', expectedVersion: 3 },
    });
  });

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
