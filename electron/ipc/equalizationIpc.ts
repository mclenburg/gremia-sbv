import type { IpcMain } from 'electron';
import { EqualizationService } from '../../services/equalizationService.js';
import { EQUALIZATION_STATUS_ORDER, evaluateEqualizationWarnings } from '../../services/equalizationWorkflowPolicy.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateEqualizationProcessInput, UpdateEqualizationProcessInput } from '../../src/app/core/models/equalization.model.js';

export function registerEqualizationIpc(ipcMain: IpcMain, security: SecurityService): void {
  const equalization = () => new EqualizationService(security.getActiveDatabase());

  ipcMain.handle('equalization:steps', async () => EQUALIZATION_STATUS_ORDER);
  ipcMain.handle('equalization:list', async (_event, caseId?: string) => equalization().list(caseId));
  ipcMain.handle('equalization:create', async (_event, input: CreateEqualizationProcessInput) => equalization().create(input));
  ipcMain.handle('equalization:update', async (_event, id: string, input: UpdateEqualizationProcessInput) => equalization().update(id, input));
  ipcMain.handle('equalization:warnings', async (_event, id: string) => {
    const record = equalization().getById(id);
    if (!record) return [];
    return evaluateEqualizationWarnings(record);
  });
}
