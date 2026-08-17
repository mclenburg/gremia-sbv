import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
} from "../../src/domain/models/report.model.js";

export function createDocumentsApi(invokeIpc: IpcInvoker) {
  return {
  reports: {
      descriptors: (): Promise<ReportDescriptor[]> =>
        invokeIpc(IPC_CHANNELS.reportsDescriptors),
      history: (limit?: number): Promise<ReportExportHistoryItem[]> =>
        invokeIpc(IPC_CHANNELS.reportsHistory, limit),
      generate: (input: GenerateReportInput): Promise<ReportGenerationResult> =>
        invokeIpc(IPC_CHANNELS.reportsGenerate, input),
      openExportFolder: (fileName?: string): Promise<{ opened: boolean }> =>
        invokeIpc(IPC_CHANNELS.reportsOpenExportFolder, fileName),
    }
  } as const;
}
