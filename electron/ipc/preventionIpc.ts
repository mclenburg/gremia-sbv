import type { IpcMain } from 'electron';
import { PreventionService } from '../../services/preventionService.js';
import { PREVENTION_STEPS, evaluatePreventionWarnings } from '../../services/preventionWorkflowPolicy.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreatePreventionProcessInput, UpdatePreventionProcessInput } from '../../src/app/core/models/prevention.model.js';

export function registerPreventionIpc(ipcMain: IpcMain, security: SecurityService): void {
  const prevention = () => new PreventionService(security.getActiveDatabase());

  ipcMain.handle('prevention:steps', async () => PREVENTION_STEPS);
  ipcMain.handle('prevention:list', async (_event, caseId?: string) => prevention().list(caseId));
  ipcMain.handle('prevention:dashboard', async () => prevention().dashboardSummary());
  ipcMain.handle('prevention:create', async (_event, input: CreatePreventionProcessInput) => prevention().create(input));
  ipcMain.handle('prevention:update', async (_event, id: string, input: UpdatePreventionProcessInput) => prevention().update(id, input));
  ipcMain.handle('prevention:warnings', async (_event, id: string) => {
    const record = prevention().getById(id);
    if (!record) return [];
    return evaluatePreventionWarnings(record);
  });
}
