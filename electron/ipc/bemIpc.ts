import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import { BEM_STEPS, evaluateBemWarnings } from "../../services/bemWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateBemProcessInput,
  UpdateBemProcessInput,
} from "../../src/domain/models/bem.model.js";
import {
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerBemIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const bem = services.bem;

  registerIpcHandler(ipcMain, IPC_CHANNELS.bemSteps, async () => BEM_STEPS);
  registerIpcHandler(ipcMain, IPC_CHANNELS.bemList, async (_event, caseId?: unknown) =>
    bem().list(assertOptionalString(caseId, "bem:list", "Fall-ID", { maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.bemDashboard, async () => bem().dashboardSummary());
  registerIpcHandler(ipcMain, IPC_CHANNELS.bemCreate, async (_event, input: unknown) =>
    bem().create(assertRecordInput<CreateBemProcessInput>(input, "bem:create")),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.bemUpdate, async (_event, id: unknown, input: unknown) =>
    bem().update(
      assertString(id, "bem:update", "BEM-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateBemProcessInput>(input, "bem:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.bemWarnings, async (_event, id: unknown) => {
    const record = bem().getById(assertString(id, "bem:warnings", "BEM-ID", { minLength: 1, maxLength: 120 }));
    if (!record) return [];
    return evaluateBemWarnings(record);
  });
}
