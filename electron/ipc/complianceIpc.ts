import type { IpcMain } from 'electron';
import { PersonalDataAuditLogService } from '../../services/auditLogService.js';
import type { SecurityService } from '../../services/securityService.js';

export function registerComplianceIpc(ipcMain: IpcMain, security: SecurityService): void {
  ipcMain.handle('compliance:audit-chain-status', async () => {
    const status = new PersonalDataAuditLogService(security.getActiveDatabase()).integritySummary();
    return {
      ok: status.ok,
      checked: status.checked,
      firstSequence: status.firstSequence,
      lastSequence: status.lastSequence,
      firstBrokenSequence: status.firstBrokenSequence,
      latestHash: status.latestHash,
      algorithm: status.algorithm,
      chainVersion: status.chainVersion,
      issueCount: status.issues.length,
      issues: status.issues.slice(0, 20).map((issue) => ({ sequence: issue.sequence, kind: issue.kind, message: issue.message }))
    };
  });
}
