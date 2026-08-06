import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CreateSbvResourceRecordInput, UpdateSbvResourceRecordInput } from '../../src/app/core/models/sbv-resource.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerSbvResourceIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const resources = services.sbvResources;

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvResourcesList, async () => resources().list());
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvResourcesDashboard, async () => resources().dashboardSummary());
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvResourcesCreate, async (_event, input: unknown) =>
    resources().create(assertRecordInput<CreateSbvResourceRecordInput>(input, 'sbvResources:create'))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvResourcesUpdate, async (_event, id: unknown, input: unknown) =>
    resources().update(
      assertString(id, 'sbvResources:update', 'Nachweis-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateSbvResourceRecordInput>(input, 'sbvResources:update')
    )
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvResourcesDelete, async (_event, id: unknown) =>
    resources().delete(assertString(id, 'sbvResources:delete', 'Nachweis-ID', { minLength: 1, maxLength: 120 }))
  );
}
