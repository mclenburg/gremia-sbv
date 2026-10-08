import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMobilePairingFileIpc } from '../../../electron/ipc/mobilePairingFileIpc';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';
import { trustedIpcEvent } from '../../helpers/trustedIpcEvent.js';

const boundary = vi.hoisted(() => ({ open: vi.fn(), save: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('electron', () => ({ dialog: { showOpenDialog: boundary.open, showSaveDialog: boundary.save } }));
vi.mock('../../../services/mobilePairingFileService', () => ({ readMobilePairingResponse: boundary.read, saveMobilePairingRequest: boundary.write }));

function handlers() {
  const registered = new Map<string, (...args: unknown[]) => Promise<unknown>>();
  const cancel = vi.fn();
  const ipcMain = { handle: (channel: string, handler: (...args: unknown[]) => Promise<unknown>) => registered.set(channel, handler) };
  registerMobilePairingFileIpc(ipcMain as never,
    { mobileCompanion: () => ({ cancelPairing: cancel }) } as never);
  return { cancel, invoke: (channel: string, ...args: unknown[]) => registered.get(channel)?.(trustedIpcEvent(ipcMain), ...args) };
}

describe('Kopplungsdateien über die native Auswahl', () => {
  beforeEach(() => vi.resetAllMocks());

  it('verändert beim Abbrechen weder Dateien noch Vertrauensbeziehungen', async () => {
    boundary.open.mockResolvedValue({ canceled: true, filePaths: [] });
    boundary.save.mockResolvedValue({ canceled: true });
    const { invoke, cancel } = handlers();
    await expect(invoke(IPC_CHANNELS.caseHandoverMobilePairingRead)).resolves.toBeNull();
    await expect(invoke(IPC_CHANNELS.caseHandoverMobilePairingExport, 'public-request')).resolves.toBe(false);
    expect(boundary.read).not.toHaveBeenCalled();
    expect(boundary.write).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    await invoke(IPC_CHANNELS.caseHandoverMobilePairingCancel, 'session-1');
    expect(cancel).toHaveBeenCalledWith('session-1');
  });

  it('verwendet ausschließlich nativ ausgewählte Dateipfade und liefert nur den Antworttext zurück', async () => {
    boundary.open.mockResolvedValue({ canceled: false, filePaths: ['/chosen/response.gsbvpair'] });
    boundary.save.mockResolvedValue({ canceled: false, filePath: '/chosen/request.gsbvpair' });
    boundary.read.mockResolvedValue('public-response');
    const { invoke } = handlers();
    await expect(invoke(IPC_CHANNELS.caseHandoverMobilePairingRead)).resolves.toBe('public-response');
    expect(boundary.read).toHaveBeenCalledWith('/chosen/response.gsbvpair');
    await expect(invoke(IPC_CHANNELS.caseHandoverMobilePairingExport, 'public-request')).resolves.toBe(true);
    expect(boundary.write).toHaveBeenCalledWith('/chosen/request.gsbvpair', 'public-request');
    await expect(invoke(IPC_CHANNELS.caseHandoverMobilePairingRead, '/unapproved/path')).rejects.toThrow('VALIDATION_FAILED');
  });
});
