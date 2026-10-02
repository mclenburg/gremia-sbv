import type { IpcMain } from 'electron';
import type { ApplicationServices } from '../applicationServices.js';
import { GremiaBrMeetingAccessService } from '../../services/gremiaBr/gremiaBrMeetingAccessService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertString } from './ipcValidation.js';

export function registerGremiaBrMeetingMinutesIpc(ipcMain: IpcMain, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrMeetingMinutesGet, async (_event, rawId: unknown) => {
    const id = assertString(rawId, 'gremia-br:meeting:minutes:get', 'Sitzungs-ID', { minLength: 1, maxLength: 120 });
    return new GremiaBrMeetingAccessService(services.gremiaBrAuth).getMinutes(id, services.gremiaBrCache.getOverview());
  });
}
