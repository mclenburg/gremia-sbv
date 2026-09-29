import { describe, expect, it, vi } from 'vitest';
import { GremiaBrTaskService } from '../../../services/gremiaBr/gremiaBrTaskService';

function createService() {
  const auth = {
    get: vi.fn(async () => ({ from: 'OPEN', allowed: ['IN_PROGRESS', 'BLOCKED'] })),
    post: vi.fn(async () => ({ id: 'task-1', title: 'Prüfung', status: 'IN_PROGRESS', version: 4 })),
  };
  return { auth, service: new GremiaBrTaskService(auth as never) };
}

describe('Gremia.BR eigene Aufgabenstatus', () => {
  it('übernimmt ausschließlich die serverseitig angebotenen Übergänge', async () => {
    const { auth, service } = createService();

    expect(await service.getTransitionOptions('task-1')).toEqual({ from: 'OPEN', allowed: ['IN_PROGRESS', 'BLOCKED'] });
    expect(auth.get).toHaveBeenCalledWith('/api/v1/tasks/task-1/transitions');
  });

  it('sendet die bewusst gewählte Änderung mit optimistischer Version an Gremia.BR', async () => {
    const { auth, service } = createService();

    expect(await service.transition('task-1', 'IN_PROGRESS', 3)).toMatchObject({ status: 'IN_PROGRESS', version: 4 });
    expect(auth.post).toHaveBeenCalledWith('/api/v1/procedures/tasks/task-1/transitions', { body: { to: 'IN_PROGRESS', expectedVersion: 3 } });
  });

  it('verweigert unbekannte Zielstatus vor einem Netzwerkrequest', async () => {
    const { auth, service } = createService();

    await expect(service.transition('task-1', 'INTERNAL', 3)).rejects.toThrow();
    expect(auth.post).not.toHaveBeenCalled();
  });

  it('meldet eine fehlende Serverbestätigung als unklaren Ausgang', async () => {
    const { auth, service } = createService();
    auth.post.mockResolvedValueOnce({ id: 'task-1', status: 'IN_PROGRESS', version: 4 } as never);

    await expect(service.transition('task-1', 'IN_PROGRESS', 3)).rejects.toThrow('nicht eindeutig bestätigt');
  });
});
