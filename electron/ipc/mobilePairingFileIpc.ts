import { dialog, type IpcMain } from 'electron';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertString } from './ipcValidation.js';
import { readMobilePairingResponse, saveMobilePairingRequest } from '../../services/mobilePairingFileService.js';
import type { ApplicationServices } from '../applicationServices.js';

export function registerMobilePairingFileIpc(ipcMain: IpcMain, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobilePairingRequest, async () =>
    services.mobileCompanion().createPairingRequest());
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobilePairingCancel, async (_event, sessionId: unknown) =>
    services.mobileCompanion().cancelPairing(assertString(sessionId, IPC_CHANNELS.caseHandoverMobilePairingCancel, 'Kopplung', { minLength: 1, maxLength: 120 })));
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobilePairingExport, async (_event, input: unknown) => {
    const request = assertString(input, IPC_CHANNELS.caseHandoverMobilePairingExport, 'Kopplungsanfrage', { minLength: 1, maxLength: 16384 });
    const selection = await dialog.showSaveDialog({
      title: 'Öffentliche Kopplungsanfrage speichern',
      defaultPath: 'gremia-kopplungsanfrage.gsbvpair',
      filters: [{ name: 'Gremia.SBV Kopplung', extensions: ['gsbvpair'] }],
    });
    if (selection.canceled || !selection.filePath) return false;
    await saveMobilePairingRequest(selection.filePath, request);
    return true;
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobilePairingRead, async () => {
    const selection = await dialog.showOpenDialog({
      title: 'Kopplungsantwort der Begleit-App öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Kopplung', extensions: ['gsbvpair'] }],
    });
    if (selection.canceled || !selection.filePaths[0]) return null;
    return readMobilePairingResponse(selection.filePaths[0]);
  });
}
