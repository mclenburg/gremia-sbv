import { describe, expect, it, vi } from 'vitest';
import { registerSecurityIpc } from '../../../electron/ipc/securityIpc';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';

type Handler = (event: object, ...args: unknown[]) => Promise<unknown>;

describe('Tresorsperre und flüchtige Sitzungsdaten', () => {
  it('räumt nach der manuellen Sperre auch registrierte Remote-Sitzungsdaten ab', async () => {
    const handlers = new Map<string, Handler>();
    const ipcMain = { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) };
    const order: string[] = [];
    const security = { lock: () => { order.push('vault'); } };
    const afterLock = vi.fn(() => { order.push('remote'); });
    registerSecurityIpc(ipcMain as never, security as never, { afterLock });

    const result = await handlers.get(IPC_CHANNELS.securityLock)?.({ senderFrame: { url: 'file:///app/index.html' } }, 'manual');

    expect(result).toEqual({ locked: true });
    expect(order).toEqual(['vault', 'remote']);
    expect(afterLock).toHaveBeenCalledTimes(1);
  });

  it('räumt Remote-Sitzungsdaten auch nach erfolgreicher Tresorzerstörung ab', async () => {
    const handlers = new Map<string, Handler>();
    const ipcMain = { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) };
    const security = { destroyLocalVault: vi.fn(() => ({ ok: true, initialized: false, unlocked: false })) };
    const afterLock = vi.fn();
    registerSecurityIpc(ipcMain as never, security as never, { afterLock });

    await handlers.get(IPC_CHANNELS.securityDestroyLocalVault)?.({ senderFrame: { url: 'file:///app/index.html' } }, 'BESTÄTIGEN');

    expect(afterLock).toHaveBeenCalledTimes(1);
  });
});
