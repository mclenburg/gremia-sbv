import type { IpcMain } from 'electron';
import { PersonalDataAuditLogService } from '../../services/auditLogService.js';
import { evaluateDatabaseIntegrity } from '../../services/databaseIntegrityService.js';
import { DsarPrefillService } from '../../services/dsarPrefillService.js';
import { ComplianceIncidentService } from '../../services/complianceIncidentService.js';
import { ComplianceSelfCheckService } from '../../services/complianceSelfCheckService.js';
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

  ipcMain.handle('compliance:self-check', async () =>
    new ComplianceSelfCheckService(security.getActiveDatabase()).evaluate(),
  );

  ipcMain.handle('compliance:incidents:list', async () =>
    new ComplianceIncidentService(security.getActiveDatabase()).list(),
  );

  ipcMain.handle('compliance:incidents:create', async (_event, input) =>
    new ComplianceIncidentService(security.getActiveDatabase()).create(input),
  );

  ipcMain.handle('compliance:incidents:update', async (_event, id, input) =>
    new ComplianceIncidentService(security.getActiveDatabase()).update(id, input),
  );
}
