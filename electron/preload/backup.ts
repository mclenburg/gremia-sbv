import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  BackupInspectionResult,
  BackupOperationResult,
} from "../../src/app/core/models/backup.model.js";

export function createBackupApi(invokeIpc: IpcInvoker) {
  return {
  backup: {
      create: (passphrase: string): Promise<BackupOperationResult> =>
        invokeIpc(IPC_CHANNELS.backupCreate, passphrase),
      inspect: (passphrase: string): Promise<BackupInspectionResult> =>
        invokeIpc(IPC_CHANNELS.backupInspect, passphrase),
      restore: (
        passphrase: string,
        confirmation: string,
      ): Promise<BackupOperationResult> =>
        invokeIpc(IPC_CHANNELS.backupRestore, passphrase, confirmation),
      openBackupFolder: (): Promise<{ opened: boolean }> =>
        invokeIpc(IPC_CHANNELS.backupOpenBackupFolder),
    }
  } as const;
}
