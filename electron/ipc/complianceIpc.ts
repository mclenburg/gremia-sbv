import type { IpcMain } from 'electron';
import { evaluateDatabaseIntegrity } from '../../services/databaseIntegrityService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';

export function registerComplianceIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  ipcMain.handle('compliance:audit-chain-status', async () =>
    services.auditLog().verifyChain(),
  );

  ipcMain.handle('compliance:database-integrity-status', async () =>
    evaluateDatabaseIntegrity(security.getActiveDatabase()),
  );

  ipcMain.handle('compliance:dsar-prefill', async (_event, input) =>
    services.dsarPrefill().buildPrefill(input),
  );

  ipcMain.handle('compliance:self-check', async () =>
    services.complianceSelfCheck().evaluate(),
  );

  ipcMain.handle('compliance:incidents:list', async () =>
    services.complianceIncidents().list(),
  );

  ipcMain.handle('compliance:incidents:create', async (_event, input) =>
    services.complianceIncidents().create(input),
  );

  ipcMain.handle('compliance:incidents:update', async (_event, id, input) =>
    services.complianceIncidents().update(id, input),
  );
}
