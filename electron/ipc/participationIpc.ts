import { registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CreateParticipationInput, UpdateParticipationInput } from '../../src/app/core/models/participation.model.js';
import { assertOptionalString, assertRecordInput, assertString } from './ipcValidation.js';

export function registerParticipationIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const participation = services.participation;

  registerIpcHandler(ipcMain, 'participation:list', async (_event, caseId?: unknown) =>
    participation().list(assertOptionalString(caseId, 'participation:list', 'Fall-ID', { maxLength: 120 }))
  );

  registerIpcHandler(ipcMain, 'participation:dashboard', async () => participation().dashboardSummary());

  registerIpcHandler(ipcMain, 'participation:create', async (_event, input: unknown) =>
    participation().create(assertRecordInput<CreateParticipationInput>(input, 'participation:create'))
  );

  registerIpcHandler(ipcMain, 'participation:update', async (_event, id: unknown, input: unknown) =>
    participation().update(
      assertString(id, 'participation:update', 'Beteiligungs-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateParticipationInput>(input, 'participation:update')
    )
  );

  registerIpcHandler(ipcMain, 'participation:warnings', async (_event, id: unknown) =>
    participation().warnings(assertString(id, 'participation:warnings', 'Beteiligungs-ID', { minLength: 1, maxLength: 120 }))
  );
}
