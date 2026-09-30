import { describe, expect, it, vi } from 'vitest';
import { GremiaBrMeetingAccessService } from '../../../services/gremiaBr/gremiaBrMeetingAccessService';
import { serializeApplicationError } from '../../../electron/ipc/ipcHandler';

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
