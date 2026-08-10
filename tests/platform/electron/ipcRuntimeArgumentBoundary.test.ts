import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';
import { registerIpcHandler } from '../../../electron/ipc/ipcHandler';

describe('IPC-Laufzeitgrenze', () => {
  it('rejects both missing and surplus arguments before the handler runs', async () => {
    let registered: ((event: object, ...args: unknown[]) => Promise<unknown>) | undefined;
    let calls = 0;
    const ipcMain = { handle: (_channel: string, handler: (event: object, ...args: unknown[]) => Promise<unknown>) => { registered = handler; } };
    registerIpcHandler(ipcMain as never, IPC_CHANNELS.securityUnlock, async (_event, password: unknown) => {
      calls += 1;
      return { password };
    });
    const event = { senderFrame: { url: 'file:///app/index.html' } };
    await expect(registered?.(event)).rejects.toThrow(/VALIDATION_FAILED/);
    await expect(registered?.(event, 'secret', 'surplus')).rejects.toThrow(/VALIDATION_FAILED/);
    await expect(registered?.(event, 'secret')).resolves.toEqual({ password: 'secret' });
    expect(calls).toBe(1);
  });
});
