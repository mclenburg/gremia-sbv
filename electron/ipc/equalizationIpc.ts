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
} from "../../src/app/core/models/equalization.model.js";
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

  ipcMain.handle("equalization:steps", async () => EQUALIZATION_STATUS_ORDER);
  ipcMain.handle("equalization:list", async (_event, caseId?: unknown) =>
    equalization().list(
      assertOptionalString(caseId, "equalization:list", "Fall-ID", { maxLength: 120 }),
    ),
  );
  ipcMain.handle("equalization:create", async (_event, input: unknown) =>
    equalization().create(
      assertRecordInput<CreateEqualizationProcessInput>(input, "equalization:create"),
    ),
  );
  ipcMain.handle("equalization:update", async (_event, id: unknown, input: unknown) =>
    equalization().update(
      assertString(id, "equalization:update", "Gleichstellungs-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateEqualizationProcessInput>(input, "equalization:update"),
    ),
  );
  ipcMain.handle("equalization:warnings", async (_event, id: unknown) => {
    const record = equalization().getById(
      assertString(id, "equalization:warnings", "Gleichstellungs-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluateEqualizationWarnings(record);
  });
}
