import { dialog, shell, type IpcMain } from 'electron';
import path from 'node:path';
import { BackupService } from '../../services/backupService.js';
import type { SecurityService } from '../../services/securityService.js';

export function registerBackupIpc(ipcMain: IpcMain, security: SecurityService): void {
  const backups = new BackupService(security);

  ipcMain.handle('backup:create', async (_event, passphrase: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Gremia.SBV-Backup erstellen',
      defaultPath: backups.defaultBackupPath(),
      buttonLabel: 'Backup speichern',
      filters: [
        { name: 'Gremia.SBV Backup', extensions: ['gsbvbackup'] }
      ]
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, error: 'Backup wurde abgebrochen.', warnings: [] };
    }
    const target = result.filePath.endsWith('.gsbvbackup') ? result.filePath : `${result.filePath}.gsbvbackup`;
    return backups.createBackup(target, passphrase);
  });

  ipcMain.handle('backup:inspect', async (_event, passphrase: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Gremia.SBV-Backup prüfen',
      properties: ['openFile'],
      filters: [
        { name: 'Gremia.SBV Backup', extensions: ['gsbvbackup'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, error: 'Backupprüfung wurde abgebrochen.', warnings: [] };
    }
    return backups.inspectBackup(result.filePaths[0], passphrase);
  });

  ipcMain.handle('backup:restore', async (_event, passphrase: string, confirmation: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Gremia.SBV-Backup wiederherstellen',
      properties: ['openFile'],
      filters: [
        { name: 'Gremia.SBV Backup', extensions: ['gsbvbackup'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, error: 'Wiederherstellung wurde abgebrochen.', warnings: [] };
    }
    return backups.restoreBackup(result.filePaths[0], passphrase, confirmation);
  });

  ipcMain.handle('backup:open-backup-folder', async () => {
    await shell.openPath(path.join(security.getDataDirectory(), 'backups'));
    return { opened: true };
  });
}
