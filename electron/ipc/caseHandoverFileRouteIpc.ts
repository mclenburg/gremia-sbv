import type { IpcMain } from 'electron';
import { classifyCaseHandoverFile } from '../../services/caseHandoverFileRoute.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertString } from './ipcValidation.js';
import { resolveSelectedFileCapability, SELECTED_FILE_PURPOSE } from './selectedFileCapability.js';

export function registerCaseHandoverFileRouteIpc(ipcMain: IpcMain): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverClassifyFile, async (_event, fileToken: unknown) => {
    const token = assertString(fileToken, IPC_CHANNELS.caseHandoverClassifyFile, 'Dateiauswahl',
      { minLength: 1, maxLength: 2000 });
    return classifyCaseHandoverFile(resolveSelectedFileCapability(token, SELECTED_FILE_PURPOSE.caseHandover,
      IPC_CHANNELS.caseHandoverClassifyFile));
  });
}
