import type { IpcMain } from 'electron';
import { RetentionService } from '../../services/retentionService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { UpdateRetentionSettingsInput } from '../../src/app/core/models/retention.model.js';

export function registerRetentionIpc(ipcMain: IpcMain, security: SecurityService): void {
  const retention = new RetentionService(() => security.getActiveDatabase(), () => security.getDataDirectory());

  ipcMain.handle('retention:dashboard', async () => retention.buildDashboard());
  ipcMain.handle('retention:settings:get', async () => retention.getSettings());
  ipcMain.handle('retention:settings:update', async (_event, input: UpdateRetentionSettingsInput) => retention.updateSettings(input));
  ipcMain.handle('retention:case:anonymize', async (_event, caseId: string, reason: string, confirmation: string) =>
    retention.anonymizeCase(caseId, reason, confirmation)
  );
  ipcMain.handle('retention:case:delete', async (_event, caseId: string, reason: string, confirmation: string) =>
    retention.deleteCase(caseId, reason, confirmation)
  );
}
