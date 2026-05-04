import type { IpcMain } from "electron";
import { BemService } from "../../services/bemService.js";
import { BEM_STEPS, evaluateBemWarnings } from "../../services/bemWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type {
  CreateBemProcessInput,
  UpdateBemProcessInput,
} from "../../src/app/core/models/bem.model.js";
import {
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerBemIpc(
  ipcMain: IpcMain,
  security: SecurityService,
): void {
  const bem = () => new BemService(security.getActiveDatabase());

  ipcMain.handle("bem:steps", async () => BEM_STEPS);
  ipcMain.handle("bem:list", async (_event, caseId?: unknown) =>
    bem().list(assertOptionalString(caseId, "bem:list", "Fall-ID", { maxLength: 120 })),
  );
  ipcMain.handle("bem:dashboard", async () => bem().dashboardSummary());
  ipcMain.handle("bem:create", async (_event, input: unknown) =>
    bem().create(assertRecordInput<CreateBemProcessInput>(input, "bem:create")),
  );
  ipcMain.handle("bem:update", async (_event, id: unknown, input: unknown) =>
    bem().update(
      assertString(id, "bem:update", "BEM-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateBemProcessInput>(input, "bem:update"),
    ),
  );
  ipcMain.handle("bem:warnings", async (_event, id: unknown) => {
    const record = bem().getById(assertString(id, "bem:warnings", "BEM-ID", { minLength: 1, maxLength: 120 }));
    if (!record) return [];
    return evaluateBemWarnings(record);
  });
}
