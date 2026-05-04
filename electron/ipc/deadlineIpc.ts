import type { IpcMain } from "electron";
import { DeadlineService } from "../../services/deadlineService.js";
import type { SecurityService } from "../../services/securityService.js";
import type {
  CreateDeadlineInput,
  DeadlineListFilters,
  UpdateDeadlineInput,
} from "../../src/app/core/models/deadline.model.js";
import {
  assertOptionalObject,
  assertOptionalString,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerDeadlineIpc(
  ipcMain: IpcMain,
  security: SecurityService,
): void {
  const deadlines = () => new DeadlineService(security.getActiveDatabase());

  ipcMain.handle("deadlines:list", async (_event, filters?: unknown) =>
    deadlines().list(
      assertOptionalObject<DeadlineListFilters>(filters, "deadlines:list", "Filter") ?? {},
    ),
  );
  ipcMain.handle("deadlines:dashboard", async () => deadlines().listDashboard());
  ipcMain.handle("deadlines:create", async (_event, input: unknown) =>
    deadlines().create(
      assertRecordInput<CreateDeadlineInput>(input, "deadlines:create"),
    ),
  );
  ipcMain.handle(
    "deadlines:update",
    async (_event, id: unknown, input: unknown) =>
      deadlines().update(
        assertString(id, "deadlines:update", "Frist-ID", { minLength: 1, maxLength: 120 }),
        assertRecordInput<UpdateDeadlineInput>(input, "deadlines:update"),
      ),
  );
  ipcMain.handle("deadlines:complete", async (_event, id: unknown, note?: unknown) =>
    deadlines().complete(
      assertString(id, "deadlines:complete", "Frist-ID", { minLength: 1, maxLength: 120 }),
      assertOptionalString(note, "deadlines:complete", "Notiz", { maxLength: 5_000 }),
    ),
  );
  ipcMain.handle("deadlines:suspend", async (_event, id: unknown, reason: unknown) =>
    deadlines().suspend(
      assertString(id, "deadlines:suspend", "Frist-ID", { minLength: 1, maxLength: 120 }),
      assertString(reason, "deadlines:suspend", "Grund", { minLength: 1, maxLength: 5_000 }),
    ),
  );
  ipcMain.handle("deadlines:cancel", async (_event, id: unknown, reason: unknown) =>
    deadlines().cancel(
      assertString(id, "deadlines:cancel", "Frist-ID", { minLength: 1, maxLength: 120 }),
      assertString(reason, "deadlines:cancel", "Grund", { minLength: 1, maxLength: 5_000 }),
    ),
  );
}
