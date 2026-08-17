import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityResult, SecurityStatus } from "../../src/domain/models/security.model.js";
import { SecurityService } from "../../services/securityService.js";
import { assertAllowedEnum, assertString } from "./ipcValidation.js";

export interface SecurityIpcRuntimeHooks {
  readonly status?: () => Promise<SecurityStatus> | SecurityStatus;
  readonly unlock?: (password: string) => Promise<SecurityResult | null> | SecurityResult | null;
}

export function registerSecurityIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  hooks: SecurityIpcRuntimeHooks = {},
): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.securityStatus, async () => hooks.status?.() ?? security.status());

  registerIpcHandler(ipcMain, IPC_CHANNELS.securitySetupInitialPassword, async (_event, password: unknown) =>
    security.setupInitialPassword(
      assertString(password, "security:setup-initial-password", "Passwort", { minLength: 1, maxLength: 512 }),
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.securityUnlock, async (_event, password: unknown) => {
    const safePassword = assertString(password, "security:unlock", "Passwort", { minLength: 1, maxLength: 512 });
    const hookedResult = await hooks.unlock?.(safePassword);
    if (hookedResult) return hookedResult;
    return security.unlock(safePassword);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.securityChangePassword,
    async (_event, currentPassword: unknown, newPassword: unknown) =>
      security.changePassword(
        assertString(currentPassword, "security:change-password", "aktuelles Passwort", { minLength: 1, maxLength: 512 }),
        assertString(newPassword, "security:change-password", "neues Passwort", { minLength: 1, maxLength: 512 }),
      ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.securityResetPasswordWithRecoveryKey,
    async (_event, recoveryKey: unknown, newPassword: unknown) =>
      security.resetPasswordWithRecoveryKey(
        assertString(recoveryKey, "security:reset-password-with-recovery-key", "Recovery-Key", { minLength: 1, maxLength: 2_000 }),
        assertString(newPassword, "security:reset-password-with-recovery-key", "neues Passwort", { minLength: 1, maxLength: 512 }),
      ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.securityDestroyLocalVault, async (_event, confirmation: unknown) =>
    security.destroyLocalVault(
      assertString(confirmation, "security:destroy-local-vault", "Bestätigung", { minLength: 1, maxLength: 200 }),
    ),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.securityLock, async (_event, reason?: unknown) => {
    const lockReason = reason === undefined || reason === null
      ? "manual"
      : assertAllowedEnum(reason, "security:lock", "Sperrgrund", ["manual", "auto"] as const);
    security.lock(lockReason);
    return { locked: true };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.securityTempFilesCleanup, async () => security.cleanupTemporaryFiles());
  registerIpcHandler(ipcMain, IPC_CHANNELS.securityTempFilesStatus, async () => security.temporaryFileStatus());
}
