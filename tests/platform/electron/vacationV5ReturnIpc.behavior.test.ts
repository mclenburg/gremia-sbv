import { describe, expect, it, vi } from 'vitest';
import { registerCaseHandoverIpc } from '../../../electron/ipc/caseHandoverIpc';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';
import { issueSelectedFileCapability, SELECTED_FILE_PURPOSE } from '../../../electron/ipc/selectedFileCapability';
import { trustedIpcEvent } from '../../helpers/trustedIpcEvent';

vi.mock('electron', () => ({ dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() } }));

describe('Format-5-Rückgabe über IPC', () => {
  it('nimmt nur eine nativ ausgewählte Datei und vollständige Entscheidungen an', async () => {
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
    const ipcMain = { handle: (channel: string, handler: (...args: unknown[]) => Promise<unknown>) =>
      handlers.set(channel, handler) };
    const review = vi.fn().mockReturnValue({ items: [] });
    const importConfirmed = vi.fn().mockReturnValue({ importId: 'import-1', acceptedCount: 1, reviewedCount: 0 });
    registerCaseHandoverIpc(ipcMain as never, {} as never,
      { vacationV5Return: () => ({ reviewFromFile: review, importConfirmedFromFile: importConfirmed }) } as never);
    const invoke = (channel: string, ...args: unknown[]) =>
      handlers.get(channel)?.(trustedIpcEvent(ipcMain), ...args);
    const filePath = '/chosen/return.gsbvtransfer';
    const fileToken = issueSelectedFileCapability(filePath, SELECTED_FILE_PURPOSE.caseHandover).fileToken;
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnReview, filePath, 'lange Passphrase'))
      .rejects.toThrow(/VALIDATION_FAILED/);
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnReview, fileToken, 'lange Passphrase'))
      .resolves.toEqual({ items: [] });
    expect(review).toHaveBeenCalledWith(filePath, 'lange Passphrase');
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnImport,
      { filePath: fileToken, passphrase: 'lange Passphrase', choices: [{ ref: 'meeting_1', action: 'accept_update' }] }))
      .rejects.toThrow(/VALIDATION_FAILED/);
    const choices = [{ ref: 'meeting_1', action: 'accept_update', expectedOriginSha256: 'a'.repeat(64) }];
    await expect(invoke(IPC_CHANNELS.caseHandoverV5ReturnImport,
      { filePath: fileToken, passphrase: 'lange Passphrase', choices }))
      .resolves.toEqual({ importId: 'import-1', acceptedCount: 1, reviewedCount: 0 });
    expect(importConfirmed).toHaveBeenCalledWith(filePath, 'lange Passphrase', choices);
  });
});
