import type { IpcMain } from 'electron';
import { WorkplaceAccommodationService } from '../../services/workplaceAccommodationService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateWorkplaceAccommodationInput, UpdateWorkplaceAccommodationInput } from '../../src/app/core/models/workplace-accommodation.model.js';
import { assertOptionalString, assertRecordInput, assertString } from './ipcValidation.js';

export function registerWorkplaceAccommodationIpc(ipcMain: IpcMain, security: SecurityService): void {
  const service = () => new WorkplaceAccommodationService(security.getActiveDatabase());

  ipcMain.handle('workplaceAccommodation:list', async (_event, caseId?: unknown) =>
    service().list(assertOptionalString(caseId, 'workplaceAccommodation:list', 'Fall-ID', { maxLength: 120 }))
  );

  ipcMain.handle('workplaceAccommodation:dashboard', async () => service().dashboardSummary());

  ipcMain.handle('workplaceAccommodation:create', async (_event, input: unknown) =>
    service().create(assertRecordInput<CreateWorkplaceAccommodationInput>(input, 'workplaceAccommodation:create'))
  );

  ipcMain.handle('workplaceAccommodation:update', async (_event, id: unknown, input: unknown) =>
    service().update(
      assertString(id, 'workplaceAccommodation:update', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateWorkplaceAccommodationInput>(input, 'workplaceAccommodation:update')
    )
  );

  ipcMain.handle('workplaceAccommodation:warnings', async (_event, id: unknown) =>
    service().warnings(assertString(id, 'workplaceAccommodation:warnings', 'Maßnahmen-ID', { minLength: 1, maxLength: 120 }))
  );
}
