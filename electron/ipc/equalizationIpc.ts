import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import {
  EQUALIZATION_STATUS_ORDER,
  evaluateEqualizationWarnings,
} from "../../services/equalizationWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateEqualizationProcessInput,
  UpdateEqualizationProcessInput,
} from "../../src/domain/models/equalization.model.js";
import {
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerEqualizationIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const equalization = services.equalization;

  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationSteps, async () => EQUALIZATION_STATUS_ORDER);
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationList, async (_event, caseId?: unknown) =>
    equalization().list(
      assertOptionalString(caseId, "equalization:list", "Fall-ID", { maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationCreate, async (_event, input: unknown) =>
    equalization().create(
      assertRecordInput<CreateEqualizationProcessInput>(input, "equalization:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationUpdate, async (_event, id: unknown, input: unknown) =>
    equalization().update(
      assertString(id, "equalization:update", "Gleichstellungs-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateEqualizationProcessInput>(input, "equalization:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationWarnings, async (_event, id: unknown) => {
    const record = equalization().getById(
      assertString(id, "equalization:warnings", "Gleichstellungs-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluateEqualizationWarnings(record);
  });
}
