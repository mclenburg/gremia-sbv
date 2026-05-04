import type { IpcMain } from 'electron';
import { ParticipationService } from '../../services/participationService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateParticipationInput, UpdateParticipationInput } from '../../src/app/core/models/participation.model.js';
import { assertOptionalString, assertRecordInput, assertString } from './ipcValidation.js';

export function registerParticipationIpc(ipcMain: IpcMain, security: SecurityService): void {
  const participation = () => new ParticipationService(security.getActiveDatabase());

  ipcMain.handle('participation:list', async (_event, caseId?: unknown) =>
    participation().list(assertOptionalString(caseId, 'participation:list', 'Fall-ID', { maxLength: 120 }))
  );

  ipcMain.handle('participation:dashboard', async () => participation().dashboardSummary());

  ipcMain.handle('participation:create', async (_event, input: unknown) =>
    participation().create(assertRecordInput<CreateParticipationInput>(input, 'participation:create'))
  );

  ipcMain.handle('participation:update', async (_event, id: unknown, input: unknown) =>
    participation().update(
      assertString(id, 'participation:update', 'Beteiligungs-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateParticipationInput>(input, 'participation:update')
    )
  );

  ipcMain.handle('participation:warnings', async (_event, id: unknown) =>
    participation().warnings(assertString(id, 'participation:warnings', 'Beteiligungs-ID', { minLength: 1, maxLength: 120 }))
  );
}
