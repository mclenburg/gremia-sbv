import type { IpcMain } from 'electron';
import { DeadlineService } from '../../services/deadlineService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateDeadlineInput, DeadlineListFilters, UpdateDeadlineInput } from '../../src/app/core/models/deadline.model.js';

export function registerDeadlineIpc(ipcMain: IpcMain, security: SecurityService): void {
  const deadlines = () => new DeadlineService(security.getActiveDatabase());

  ipcMain.handle('deadlines:list', async (_event, filters?: DeadlineListFilters) => deadlines().list(filters ?? {}));
  ipcMain.handle('deadlines:dashboard', async () => deadlines().listDashboard());
  ipcMain.handle('deadlines:create', async (_event, input: CreateDeadlineInput) => deadlines().create(input));
  ipcMain.handle('deadlines:update', async (_event, id: string, input: UpdateDeadlineInput) => deadlines().update(id, input));
  ipcMain.handle('deadlines:complete', async (_event, id: string, note?: string) => deadlines().complete(id, note));
  ipcMain.handle('deadlines:suspend', async (_event, id: string, reason: string) => deadlines().suspend(id, reason));
  ipcMain.handle('deadlines:cancel', async (_event, id: string, reason: string) => deadlines().cancel(id, reason));
}
