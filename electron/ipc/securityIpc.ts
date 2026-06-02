import type { IpcMain } from "electron";
import type { SecurityResult, SecurityStatus } from "../../src/app/core/models/security.model.js";
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
  ipcMain.handle("security:status", async () => hooks.status?.() ?? security.status());

  ipcMain.handle("security:setup-initial-password", async (_event, password: unknown) =>
    security.setupInitialPassword(
      assertString(password, "security:setup-initial-password", "Passwort", { minLength: 1, maxLength: 512 }),
    ),
  );

  ipcMain.handle("security:unlock", async (_event, password: unknown) => {
    const safePassword = assertString(password, "security:unlock", "Passwort", { minLength: 1, maxLength: 512 });
    const hookedResult = await hooks.unlock?.(safePassword);
    if (hookedResult) return hookedResult;
    return security.unlock(safePassword);
  });

  ipcMain.handle(
    "security:change-password",
    async (_event, currentPassword: unknown, newPassword: unknown) =>
      security.changePassword(
        assertString(currentPassword, "security:change-password", "aktuelles Passwort", { minLength: 1, maxLength: 512 }),
        assertString(newPassword, "security:change-password", "neues Passwort", { minLength: 1, maxLength: 512 }),
      ),
  );

  ipcMain.handle(
    "security:reset-password-with-recovery-key",
    async (_event, recoveryKey: unknown, newPassword: unknown) =>
      security.resetPasswordWithRecoveryKey(
        assertString(recoveryKey, "security:reset-password-with-recovery-key", "Recovery-Key", { minLength: 1, maxLength: 2_000 }),
        assertString(newPassword, "security:reset-password-with-recovery-key", "neues Passwort", { minLength: 1, maxLength: 512 }),
      ),
  );

  ipcMain.handle("security:destroy-local-vault", async (_event, confirmation: unknown) =>
    security.destroyLocalVault(
      assertString(confirmation, "security:destroy-local-vault", "Bestätigung", { minLength: 1, maxLength: 200 }),
    ),
  );

  ipcMain.handle("security:lock", async (_event, reason?: unknown) => {
    const lockReason = reason === undefined || reason === null
      ? "manual"
      : assertAllowedEnum(reason, "security:lock", "Sperrgrund", ["manual", "auto"] as const);
    security.lock(lockReason);
    return { locked: true };
  });

  ipcMain.handle("security:temp-files:cleanup", async () => security.cleanupTemporaryFiles());
  ipcMain.handle("security:temp-files:status", async () => security.temporaryFileStatus());
}
