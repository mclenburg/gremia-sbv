import type { IpcMain } from 'electron';
import { BemService } from '../../services/bemService.js';
import { BEM_STEPS, evaluateBemWarnings } from '../../services/bemWorkflowPolicy.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateBemProcessInput, UpdateBemProcessInput } from '../../src/app/core/models/bem.model.js';

export function registerBemIpc(ipcMain: IpcMain, security: SecurityService): void {
  const bem = () => new BemService(security.getActiveDatabase());

  ipcMain.handle('bem:steps', async () => BEM_STEPS);
  ipcMain.handle('bem:list', async (_event, caseId?: string) => bem().list(caseId));
  ipcMain.handle('bem:dashboard', async () => bem().dashboardSummary());
  ipcMain.handle('bem:create', async (_event, input: CreateBemProcessInput) => bem().create(input));
  ipcMain.handle('bem:update', async (_event, id: string, input: UpdateBemProcessInput) => bem().update(id, input));
  ipcMain.handle('bem:warnings', async (_event, id: string) => {
    const record = bem().getById(id);
    if (!record) return [];
    return evaluateBemWarnings(record);
  });
}
