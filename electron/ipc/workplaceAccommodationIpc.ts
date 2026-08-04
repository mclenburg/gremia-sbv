import { registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CreateWorkplaceAccommodationInput, UpdateWorkplaceAccommodationInput } from '../../src/app/core/models/workplace-accommodation.model.js';
import { assertOptionalString, assertRecordInput, assertString } from './ipcValidation.js';

export function registerWorkplaceAccommodationIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const service = services.workplaceAccommodation;

  registerIpcHandler(ipcMain, 'workplaceAccommodation:list', async (_event, caseId?: unknown) =>
    service().list(assertOptionalString(caseId, 'workplaceAccommodation:list', 'Fall-ID', { maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, 'workplaceAccommodation:dashboard', async () => service().dashboardSummary());

  registerIpcHandler(ipcMain, 'workplaceAccommodation:create', async (_event, input: unknown) =>
    service().create(assertRecordInput<CreateWorkplaceAccommodationInput>(input, 'workplaceAccommodation:create'))
  );

  registerIpcHandler(ipcMain, 'workplaceAccommodation:update', async (_event, id: unknown, input: unknown) =>
    service().update(
      assertString(id, 'workplaceAccommodation:update', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateWorkplaceAccommodationInput>(input, 'workplaceAccommodation:update')
    )
  );

  registerIpcHandler(ipcMain, 'workplaceAccommodation:warnings', async (_event, id: unknown) =>
    service().warnings(assertString(id, 'workplaceAccommodation:warnings', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }))
  );
}
