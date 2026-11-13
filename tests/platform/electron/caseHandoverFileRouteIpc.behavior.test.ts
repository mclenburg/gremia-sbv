import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { registerCaseHandoverFileRouteIpc } from '../../../electron/ipc/caseHandoverFileRouteIpc';
import { IPC_CHANNELS } from '../../../electron/ipc/channels';
import { issueSelectedFileCapability, SELECTED_FILE_PURPOSE } from '../../../electron/ipc/selectedFileCapability';
import { trustedIpcEvent } from '../../helpers/trustedIpcEvent';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-file-route-ipc-'));
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('automatische Übergabedatei-Zuordnung über IPC', () => {
  it('verwendet ausschließlich ein nativ ausgestelltes Datei-Token', async () => {
    const file = path.join(directory, 'vertretung.gsbvtransfer');
    fs.writeFileSync(file, JSON.stringify({ format: 'gremia-sbv-case-handover', version: 5,
      senderProof: { packageType: 'vacation_handover' } }));
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
    const ipcMain = { handle: (channel: string, handler: (...args: unknown[]) => Promise<unknown>) =>
      handlers.set(channel, handler) };
    registerCaseHandoverFileRouteIpc(ipcMain as never);
    const invoke = (value: string) => handlers.get(IPC_CHANNELS.caseHandoverClassifyFile)!(trustedIpcEvent(ipcMain), value);
    await expect(invoke(file)).rejects.toThrow(/VALIDATION_FAILED/);
    const token = issueSelectedFileCapability(file, SELECTED_FILE_PURPOSE.caseHandover).fileToken;
    await expect(invoke(token)).resolves.toEqual({ kind: 'vacation_v5', formatVersion: 5 });
  });
});
