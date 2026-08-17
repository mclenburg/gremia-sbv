import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import { PREVENTION_STEPS, evaluatePreventionWarnings } from "../../services/preventionWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreatePreventionProcessInput,
  UpdatePreventionProcessInput,
} from "../../src/domain/models/prevention.model.js";
import {
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerPreventionIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const prevention = services.prevention;

  registerIpcHandler(ipcMain, IPC_CHANNELS.preventionSteps, async () => PREVENTION_STEPS);
  registerIpcHandler(ipcMain, IPC_CHANNELS.preventionList, async (_event, caseId?: unknown) =>
    prevention().list(assertOptionalString(caseId, "prevention:list", "Fall-ID", { maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.preventionDashboard, async () => prevention().dashboardSummary());
  registerIpcHandler(ipcMain, IPC_CHANNELS.preventionCreate, async (_event, input: unknown) =>
    prevention().create(
      assertRecordInput<CreatePreventionProcessInput>(input, "prevention:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.preventionUpdate, async (_event, id: unknown, input: unknown) =>
    prevention().update(
      assertString(id, "prevention:update", "Präventions-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdatePreventionProcessInput>(input, "prevention:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.preventionWarnings, async (_event, id: unknown) => {
    const record = prevention().getById(
      assertString(id, "prevention:warnings", "Präventions-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluatePreventionWarnings(record);
  });
}
