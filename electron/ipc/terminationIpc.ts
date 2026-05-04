import type { IpcMain } from 'electron';
import { TerminationService } from '../../services/terminationService.js';
import { evaluateTerminationWarnings, TERMINATION_STATUS_ORDER } from '../../services/terminationWorkflowPolicy.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateTerminationHearingInput, UpdateTerminationHearingInput } from '../../src/app/core/models/termination.model.js';

export function registerTerminationIpc(ipcMain: IpcMain, security: SecurityService): void {
  const termination = () => new TerminationService(security.getActiveDatabase());

  ipcMain.handle('termination:steps', async () => TERMINATION_STATUS_ORDER);
  ipcMain.handle('termination:list', async (_event, caseId?: string) => termination().list(caseId));
  ipcMain.handle('termination:create', async (_event, input: CreateTerminationHearingInput) => termination().create(input));
  ipcMain.handle('termination:update', async (_event, id: string, input: UpdateTerminationHearingInput) => termination().update(id, input));
  ipcMain.handle('termination:warnings', async (_event, id: string) => {
    const record = termination().getById(id);
    if (!record) return [];
    return evaluateTerminationWarnings(record);
  });
}
