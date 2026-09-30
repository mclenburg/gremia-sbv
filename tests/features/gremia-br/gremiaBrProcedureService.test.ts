import { describe, expect, it, vi } from 'vitest';
import { GremiaBrProcedureService } from '../../../services/gremiaBr/gremiaBrProcedureService';
import { GremiaBrHttpError } from '../../../services/gremiaBr/gremiaBrHttpClient';

describe('Gremia.BR-Verfahrensdienst', () => {
  it('lädt den fachlichen Verfahrensstand nur auf Aktion und mit gemeinsamer Request-Korrelation', async () => {
    const get = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/outcome')) return { id: 'outcome-1', procedureId: 'procedure-1', outcomeCode: 'APPROVED', recordedAt: '2026-09-29T10:00:00Z' };
      if (url.endsWith('/deadlines')) return [{ id: 'deadline-1', procedureId: 'procedure-1', rule: 'Frist', calculatedDeadline: '2026-10-05T10:00:00Z', status: 'CALCULATED' }];
      if (url.endsWith('/deferrals')) return [
        { id: 'deferral-1', subjectType: 'PROCEDURE', subjectId: 'procedure-1', title: 'Rückmeldung prüfen', nextDueAt: '2026-10-06T10:00:00Z', active: true },
        { id: 'deferral-foreign', subjectType: 'PROCEDURE', subjectId: 'procedure-2', title: 'Fremder Vorgang', nextDueAt: '2026-10-06T10:00:00Z', active: true },
      ];
      return { id: 'procedure-1', masterCaseId: 'case-1', procedureType: 'SBV_PARTICIPATION', state: 'UNDER_REVIEW', workflow: 'STANDARD', openedAt: '2026-09-20T10:00:00Z', version: 2, technicalCompleteness: 'COMPLETE', substantiveCompleteness: 'INFORMATION_REQUESTED' };
    });
    const service = new GremiaBrProcedureService({ get } as never);
    expect(get).not.toHaveBeenCalled();
    const detail = await service.getDetail('procedure-1', 'case-1');
    expect(detail).toMatchObject({
      technicalCompleteness: 'COMPLETE', substantiveCompleteness: 'INFORMATION_REQUESTED',
      outcome: { code: 'APPROVED' }, deadlines: [{ id: 'deadline-1' }], deferrals: [{ title: 'Rückmeldung prüfen' }],
    });
    expect(JSON.stringify(detail)).not.toContain('Fremder Vorgang');
    expect(get).toHaveBeenCalledTimes(4);
    const ids = get.mock.calls.map((call) => call[1]?.correlationId);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toEqual(expect.any(String));
  });

  it('akzeptiert ein noch fehlendes Ergebnis, aber keine fremden Fristen', async () => {
    const get = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/outcome')) throw new GremiaBrHttpError('Nicht gefunden', 404, url);
      if (url.endsWith('/deadlines')) return [{ id: 'deadline-foreign', procedureId: 'other', rule: 'Frist', calculatedDeadline: '2026-10-05T10:00:00Z', status: 'CALCULATED' }];
      if (url.endsWith('/deferrals')) return [];
      return { id: 'procedure-1', masterCaseId: 'case-1', procedureType: 'SBV_PARTICIPATION', state: 'UNDER_REVIEW', workflow: 'STANDARD', openedAt: '2026-09-20T10:00:00Z', version: 2, technicalCompleteness: 'COMPLETE', substantiveCompleteness: 'NOT_REVIEWED' };
    });
    const service = new GremiaBrProcedureService({ get } as never);
    await expect(service.getDetail('procedure-1', 'case-1')).rejects.toThrow('widersprüchliche Verfahrensfrist');
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/outcome')) throw new GremiaBrHttpError('Nicht gefunden', 404, url);
      if (url.endsWith('/deadlines') || url.endsWith('/deferrals')) return [];
      return { id: 'procedure-1', masterCaseId: 'case-1', procedureType: 'SBV_PARTICIPATION', state: 'UNDER_REVIEW', workflow: 'STANDARD', openedAt: '2026-09-20T10:00:00Z', version: 2, technicalCompleteness: 'COMPLETE', substantiveCompleteness: 'NOT_REVIEWED' };
    });
    await expect(service.getDetail('procedure-1', 'case-1')).resolves.toMatchObject({ outcome: null, deadlines: [], deferrals: [] });
  });

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
