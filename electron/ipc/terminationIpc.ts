import type { IpcMain } from "electron";
import { TerminationService } from "../../services/terminationService.js";
import {
  evaluateTerminationWarnings,
  TERMINATION_STATUS_ORDER,
} from "../../services/terminationWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
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
): void {
  const termination = () => new TerminationService(security.getActiveDatabase());

  ipcMain.handle("termination:steps", async () => TERMINATION_STATUS_ORDER);
  ipcMain.handle("termination:list", async (_event, caseId?: unknown) =>
    termination().list(
      assertOptionalString(caseId, "termination:list", "Fall-ID", { maxLength: 120 }),
    ),
  );
  ipcMain.handle("termination:create", async (_event, input: unknown) =>
    termination().create(
      assertRecordInput<CreateTerminationHearingInput>(input, "termination:create"),
    ),
  );
  ipcMain.handle("termination:update", async (_event, id: unknown, input: unknown) =>
    termination().update(
      assertString(id, "termination:update", "Kündigungsanhörungs-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateTerminationHearingInput>(input, "termination:update"),
    ),
  );
  ipcMain.handle("termination:warnings", async (_event, id: unknown) => {
    const record = termination().getById(
      assertString(id, "termination:warnings", "Kündigungsanhörungs-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluateTerminationWarnings(record);
  });
}
