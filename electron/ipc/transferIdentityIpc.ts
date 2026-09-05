import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';

export function registerTransferIdentityIpc(ipcMain: IpcMain, _security: SecurityService, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferIdentityGet, async () => services.transferIdentity().getPublicIdentity());
}
