import { dialog, shell, type IpcMain } from "electron";
import path from "node:path";
import { BackupService } from "../../services/backupService.js";
import type { SecurityService } from "../../services/securityService.js";
import { assertString, ensurePathInside } from "./ipcValidation.js";

export function registerBackupIpc(
  ipcMain: IpcMain,
  security: SecurityService,
): void {
  const backups = new BackupService(security);

  ipcMain.handle("backup:create", async (_event, passphrase: unknown) => {
    const validatedPassphrase = assertString(passphrase, "backup:create", "Backup-Passphrase", { minLength: 1, maxLength: 512 });
    const result = await dialog.showSaveDialog({
      title: "Gremia.SBV-Backup erstellen",
      defaultPath: backups.defaultBackupPath(),
      buttonLabel: "Backup speichern",
      filters: [{ name: "Gremia.SBV Backup", extensions: ["gsbvbackup"] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, error: "Backup wurde abgebrochen.", warnings: [] };
    }
    const target = result.filePath.endsWith(".gsbvbackup")
      ? result.filePath
      : `${result.filePath}.gsbvbackup`;
    return backups.createBackup(target, validatedPassphrase);
  });

  ipcMain.handle("backup:inspect", async (_event, passphrase: unknown) => {
    const validatedPassphrase = assertString(passphrase, "backup:inspect", "Backup-Passphrase", { minLength: 1, maxLength: 512 });
    const result = await dialog.showOpenDialog({
      title: "Gremia.SBV-Backup prüfen",
      properties: ["openFile"],
      filters: [{ name: "Gremia.SBV Backup", extensions: ["gsbvbackup"] }],
    });
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, error: "Backupprüfung wurde abgebrochen.", warnings: [] };
    }
    return backups.inspectBackup(result.filePaths[0], validatedPassphrase);
  });

  ipcMain.handle("backup:restore", async (_event, passphrase: unknown, confirmation: unknown) => {
    const validatedPassphrase = assertString(passphrase, "backup:restore", "Backup-Passphrase", { minLength: 1, maxLength: 512 });
    const validatedConfirmation = assertString(confirmation, "backup:restore", "Bestätigung", { minLength: 1, maxLength: 200 });
    const result = await dialog.showOpenDialog({
      title: "Gremia.SBV-Backup wiederherstellen",
      properties: ["openFile"],
      filters: [{ name: "Gremia.SBV Backup", extensions: ["gsbvbackup"] }],
    });
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, error: "Wiederherstellung wurde abgebrochen.", warnings: [] };
    }
    return backups.restoreBackup(result.filePaths[0], validatedPassphrase, validatedConfirmation);
  });

  ipcMain.handle("backup:open-backup-folder", async () => {
    const backupDir = ensurePathInside(
      path.join(security.getDataDirectory(), "backups"),
      security.getDataDirectory(),
      "backup:open-backup-folder",
      "Backup-Ordner",
    );
    await shell.openPath(backupDir);
    return { opened: true };
  });
}
