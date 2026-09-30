import { describe, expect, it, vi } from 'vitest';
import { GremiaBrMeetingAccessService } from '../../../services/gremiaBr/gremiaBrMeetingAccessService';
import { serializeApplicationError } from '../../../electron/ipc/ipcHandler';
import { GremiaBrHttpError } from '../../../services/gremiaBr/gremiaBrHttpClient';

const overview = {
  upcomingMeetings: [{ id: 'meeting-1', bodyId: 'body-1', mode: 'HYBRID', hasRemoteAccess: true }],
};

function createAuth(get: ReturnType<typeof vi.fn>) {
  return { get, getReadContext: vi.fn(() => ({ apiMode: 'gremia_br_v2', selectedBodyId: 'body-1' })) };
}

describe('Gremia.BR-Sitzungszugang', () => {
  it('verweigert Präsenzsitzungen und fremde Sitzungen vor jedem Netzwerkzugriff', async () => {
    const auth = createAuth(vi.fn());
    const service = new GremiaBrMeetingAccessService(auth as never);

    await expect(service.getAccess('meeting-2', overview as never)).rejects.toThrow('kein Remote-Zugang vorgesehen');
    await expect(service.getAccess('meeting-1', {
      upcomingMeetings: [{ id: 'meeting-1', bodyId: 'body-1', mode: 'PRESENCE', hasRemoteAccess: true }],
    } as never)).rejects.toThrow('kein Remote-Zugang vorgesehen');
    expect(auth.get).not.toHaveBeenCalled();
  });
  it('gibt nur den validierten Zugangstext zurück', async () => {
    const auth = createAuth(vi.fn().mockResolvedValue({ access: 'Einwahl: 123\nPIN: 456' }));
    const service = new GremiaBrMeetingAccessService(auth as never);

    expect(await service.getAccess('meeting-1', overview as never)).toBe('Einwahl: 123\nPIN: 456');
    expect(auth.get).toHaveBeenCalledExactlyOnceWith('/api/v1/meetings/meeting-1/remote-access');
  });

  it('gibt bei ungültiger Antwort oder technischem Fehler keine Antwortinhalte im Fehler preis', async () => {
    const auth = createAuth(vi.fn().mockResolvedValue({ access: '' }));
    const service = new GremiaBrMeetingAccessService(auth as never);

    await expect(service.getAccess('meeting-1', overview as never)).rejects.toThrow('keinen gültigen Remote-Zugang');
    auth.get.mockRejectedValueOnce(new Error('geheim: PIN 456'));
    let message = '';
    try { await service.getAccess('meeting-1', overview as never); } catch (error) {
      message = serializeApplicationError(error, 'gremia-br:meeting:remote-access:get');
    }
    expect(message).toContain('Remote-Zugang konnte nicht geladen werden');
    expect(message).not.toContain('PIN 456');
  });
});

describe('Gremia.BR-Niederschrift', () => {
  it('liest nur die ausgewählte berechtigte Sitzung und gibt keine fremden Daten weiter', async () => {
    const get = vi.fn().mockResolvedValue({ id: 'minutes-1', meetingId: 'meeting-1', kind: 'RESULT_MINUTES', status: 'COMPLETED', protectionClass: 'HIGH', currentVersionId: 'version-1', contentComplete: true, contentMissing: [], version: 2 });
    const service = new GremiaBrMeetingAccessService(createAuth(get) as never);
    await expect(service.getMinutes('meeting-2', overview as never)).rejects.toThrow('aktuellen Arbeitsstand');
    expect(get).not.toHaveBeenCalled();
    await expect(service.getMinutes('meeting-1', overview as never)).resolves.toEqual({
      kind: 'RESULT_MINUTES', status: 'COMPLETED', protectionClass: 'HIGH', version: 2,
      contentComplete: true, contentMissing: [],
    });
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/meetings/meeting-1/minutes');
  });

  it('zeigt fehlende Niederschriften ehrlich und verwirft unvollständige Antworten', async () => {
    const get = vi.fn().mockRejectedValueOnce(new GremiaBrHttpError('Nicht gefunden', 404, 'GET /api/v1/meetings/{meetingId}/minutes'))
      .mockResolvedValueOnce({ id: 'minutes-1', meetingId: 'meeting-2', status: 'COMPLETED' });
    const service = new GremiaBrMeetingAccessService(createAuth(get) as never);
    await expect(service.getMinutes('meeting-1', overview as never)).resolves.toBeNull();
    await expect(service.getMinutes('meeting-1', overview as never)).rejects.toThrow('unvollständige Niederschrift');
  });
});

describe('Gremia.BR-Tagesordnungsänderungen', () => {
  const meeting = { upcomingMeetings: [{ id: 'meeting-1', bodyId: 'body-1' }] };
  const item = (itemKey: string, title: string, ordinal: number) => ({
    id: `version-${itemKey}`, itemKey, title, ordinal, type: 'INFORMATION',
    expectsDecision: false, description: null, timeAllocationMinutes: null,
  });

  it('vergleicht die aktuelle Agenda mit der ersten versandten Fassung anhand stabiler TOP-Kennungen', async () => {
    const get = vi.fn(async (path: string) => path.endsWith('/versions') ? [
      { id: 'v2', versionNumber: 2, sealed: false, items: [item('a', 'A neu', 1), item('c', 'C', 2)] },
      { id: 'v1', versionNumber: 1, sealed: true, sealedAt: '2026-09-01T10:00:00Z', items: [item('a', 'A', 1), item('b', 'B', 2)] },
    ] : { id: 'v2', versionNumber: 2, sealed: false, items: [item('a', 'A neu', 1), item('c', 'C', 2)] });
    const service = new GremiaBrMeetingAccessService(createAuth(get) as never);

    const result = await service.getAgendaChanges('meeting-1', meeting as never);

    expect(result.items.map((entry) => entry.title)).toEqual(['A neu', 'C']);
    expect(result.changes).toEqual([
      { kind: 'changed', title: 'A neu', previousTitle: 'A' },
      { kind: 'added', title: 'C' },
      { kind: 'removed', title: 'B' },
    ]);
    expect(result.comparisonAvailable).toBe(true);
    expect(get).toHaveBeenCalledWith('/api/v1/meetings/meeting-1/agenda');
    expect(get).toHaveBeenCalledWith('/api/v1/meetings/meeting-1/agenda/versions');
  });

  it('behauptet ohne versandte Einladungsfassung keine unveränderte Tagesordnung', async () => {
    const get = vi.fn(async (path: string) => path.endsWith('/versions') ? [] : {
      id: 'v1', versionNumber: 1, sealed: false, items: [
        { id: 'a', itemKey: 'a', ordinal: 1, type: 'INFORMATION', expectsDecision: false },
      ],
    });
    const result = await new GremiaBrMeetingAccessService(createAuth(get) as never)
      .getAgendaChanges('meeting-1', meeting as never);

    expect(result.comparisonAvailable).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.items).toEqual([{ title: 'Titel nicht freigegeben' }]);
  });

  it('verweigert nicht zum ausgewählten Gremium gehörende Sitzungen vor dem Netzwerkzugriff', async () => {
    const get = vi.fn();
    await expect(new GremiaBrMeetingAccessService(createAuth(get) as never)
      .getAgendaChanges('foreign', meeting as never)).rejects.toThrow('aktuellen Arbeitsstand');
    expect(get).not.toHaveBeenCalled();
  });
});
