import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  SecurityResult,
  SecurityStatus,
} from "../../src/app/core/models/security.model.js";

export function createSecurityApi(invokeIpc: IpcInvoker) {
  return {
  security: {
      status: (): Promise<SecurityStatus> =>
        invokeIpc(IPC_CHANNELS.securityStatus),
      setupInitialPassword: (password: string): Promise<SecurityResult> =>
        invokeIpc(IPC_CHANNELS.securitySetupInitialPassword, password),
      unlock: (password: string): Promise<SecurityResult> =>
        invokeIpc(IPC_CHANNELS.securityUnlock, password),
      changePassword: (
        currentPassword: string,
        newPassword: string,
      ): Promise<SecurityResult> =>
        invokeIpc(
          IPC_CHANNELS.securityChangePassword,
          currentPassword,
          newPassword,
        ),
      resetPasswordWithRecoveryKey: (
        recoveryKey: string,
        newPassword: string,
      ): Promise<SecurityResult> =>
        invokeIpc(
          IPC_CHANNELS.securityResetPasswordWithRecoveryKey,
          recoveryKey,
          newPassword,
        ),
      destroyLocalVault: (confirmation: string): Promise<SecurityResult> =>
        invokeIpc(IPC_CHANNELS.securityDestroyLocalVault, confirmation),
      lock: (reason?: "manual" | "auto"): Promise<{ locked: boolean }> =>
        invokeIpc(IPC_CHANNELS.securityLock, reason),
      cleanupTemporaryFiles: (): Promise<{
        deleted: number;
        failed: number;
        remaining: number;
        bytesRemaining: number;
      }> => invokeIpc(IPC_CHANNELS.securityTempFilesCleanup),
      temporaryFileStatus: (): Promise<{
        root: string;
        remaining: number;
        bytesRemaining: number;
        oldestRemainingAt?: string;
      }> => invokeIpc(IPC_CHANNELS.securityTempFilesStatus),
    }
  } as const;
}
