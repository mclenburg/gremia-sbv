import type { IpcMain } from 'electron';
import { SbvResourceService } from '../../services/sbvResourceService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateSbvResourceRecordInput, UpdateSbvResourceRecordInput } from '../../src/app/core/models/sbv-resource.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerSbvResourceIpc(ipcMain: IpcMain, security: SecurityService): void {
  const resources = () => new SbvResourceService(security.getActiveDatabase());

  ipcMain.handle('sbvResources:list', async () => resources().list());
  ipcMain.handle('sbvResources:dashboard', async () => resources().dashboardSummary());
  ipcMain.handle('sbvResources:create', async (_event, input: unknown) =>
    resources().create(assertRecordInput<CreateSbvResourceRecordInput>(input, 'sbvResources:create'))
  );
  ipcMain.handle('sbvResources:update', async (_event, id: unknown, input: unknown) =>
    resources().update(
      assertString(id, 'sbvResources:update', 'Nachweis-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateSbvResourceRecordInput>(input, 'sbvResources:update')
    )
  );
  ipcMain.handle('sbvResources:delete', async (_event, id: unknown) =>
    resources().delete(assertString(id, 'sbvResources:delete', 'Nachweis-ID', { minLength: 1, maxLength: 120 }))
  );
}
