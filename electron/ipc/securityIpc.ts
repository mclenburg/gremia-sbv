import type { IpcMain } from 'electron';
import { SecurityService } from '../../services/securityService.js';

export function registerSecurityIpc(ipcMain: IpcMain, security: SecurityService): void {
  ipcMain.handle('security:status', async () => {
    return security.status();
  });

  ipcMain.handle('security:setup-initial-password', async (_event, password: string) => {
    return security.setupInitialPassword(password);
  });

  ipcMain.handle('security:unlock', async (_event, password: string) => {
    return security.unlock(password);
  });

  ipcMain.handle('security:change-password', async (_event, currentPassword: string, newPassword: string) => {
    return security.changePassword(currentPassword, newPassword);
  });

  ipcMain.handle('security:reset-password-with-recovery-key', async (_event, recoveryKey: string, newPassword: string) => {
    return security.resetPasswordWithRecoveryKey(recoveryKey, newPassword);
  });

  ipcMain.handle('security:destroy-local-vault', async (_event, confirmation: string) => {
    return security.destroyLocalVault(confirmation);
  });

  ipcMain.handle('security:lock', async () => {
    security.lock();
    return { locked: true };
  });
}
