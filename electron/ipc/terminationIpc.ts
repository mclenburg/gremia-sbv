import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import {
  evaluateTerminationWarnings,
  TERMINATION_STATUS_ORDER,
} from "../../services/terminationWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateTerminationHearingInput,
  UpdateTerminationHearingInput,
} from "../../src/app/core/models/termination.model.js";
import {
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerTerminationIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const termination = services.termination;

  registerIpcHandler(ipcMain, IPC_CHANNELS.terminationSteps, async () => TERMINATION_STATUS_ORDER);
  registerIpcHandler(ipcMain, IPC_CHANNELS.terminationList, async (_event, caseId?: unknown) =>
    termination().list(
      assertOptionalString(caseId, "termination:list", "Fall-ID", { maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.terminationCreate, async (_event, input: unknown) =>
    termination().create(
      assertRecordInput<CreateTerminationHearingInput>(input, "termination:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.terminationUpdate, async (_event, id: unknown, input: unknown) =>
    termination().update(
      assertString(id, "termination:update", "Kündigungsanhörungs-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateTerminationHearingInput>(input, "termination:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.terminationWarnings, async (_event, id: unknown) => {
    const record = termination().getById(
      assertString(id, "termination:warnings", "Kündigungsanhörungs-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluateTerminationWarnings(record);
  });
}
