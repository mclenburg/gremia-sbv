import type { IpcMain } from "electron";
import { PreventionService } from "../../services/preventionService.js";
import { PREVENTION_STEPS, evaluatePreventionWarnings } from "../../services/preventionWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type {
  CreatePreventionProcessInput,
  UpdatePreventionProcessInput,
} from "../../src/app/core/models/prevention.model.js";
import {
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerPreventionIpc(
  ipcMain: IpcMain,
  security: SecurityService,
): void {
  const prevention = () => new PreventionService(security.getActiveDatabase());

  ipcMain.handle("prevention:steps", async () => PREVENTION_STEPS);
  ipcMain.handle("prevention:list", async (_event, caseId?: unknown) =>
    prevention().list(assertOptionalString(caseId, "prevention:list", "Fall-ID", { maxLength: 120 })),
  );
  ipcMain.handle("prevention:dashboard", async () => prevention().dashboardSummary());
  ipcMain.handle("prevention:create", async (_event, input: unknown) =>
    prevention().create(
      assertRecordInput<CreatePreventionProcessInput>(input, "prevention:create"),
    ),
  );
  ipcMain.handle("prevention:update", async (_event, id: unknown, input: unknown) =>
    prevention().update(
      assertString(id, "prevention:update", "Präventions-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdatePreventionProcessInput>(input, "prevention:update"),
    ),
  );
  ipcMain.handle("prevention:warnings", async (_event, id: unknown) => {
    const record = prevention().getById(
      assertString(id, "prevention:warnings", "Präventions-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluatePreventionWarnings(record);
  });
}
