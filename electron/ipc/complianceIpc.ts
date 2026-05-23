import type { IpcMain } from 'electron';
import { PersonalDataAuditLogService } from '../../services/auditLogService.js';
import { evaluateDatabaseIntegrity } from '../../services/databaseIntegrityService.js';
import { DsarPrefillService } from '../../services/dsarPrefillService.js';
import type { SecurityService } from '../../services/securityService.js';

export function registerComplianceIpc(ipcMain: IpcMain, security: SecurityService): void {
  ipcMain.handle('compliance:audit-chain-status', async () =>
    new PersonalDataAuditLogService(security.getActiveDatabase()).verifyChain(),
  );

  ipcMain.handle('compliance:database-integrity-status', async () =>
    evaluateDatabaseIntegrity(security.getActiveDatabase()),
  );

  ipcMain.handle('compliance:dsar-prefill', async (_event, input) =>
    new DsarPrefillService(security.getActiveDatabase()).buildPrefill(input),
  );
}
