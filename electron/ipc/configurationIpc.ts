import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { registerGremiaBrIpc } from './gremiaBrIpc.js';
import { registerTransferIdentityIpc } from './transferIdentityIpc.js';

export function registerConfigurationIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  registerGremiaBrIpc(ipcMain, security, services);
  registerTransferIdentityIpc(ipcMain, security, services);
}
