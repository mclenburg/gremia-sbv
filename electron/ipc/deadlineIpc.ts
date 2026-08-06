import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
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
  services: ApplicationServices,
): void {
  const deadlines = services.deadlines;

  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesList, async (_event, filters?: unknown) =>
    deadlines().list(
      assertOptionalObject<DeadlineListFilters>(filters, "deadlines:list", "Filter") ?? {},
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesDashboard, async () => deadlines().listDashboard());
  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesCreate, async (_event, input: unknown) =>
    deadlines().create(
      assertRecordInput<CreateDeadlineInput>(input, "deadlines:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesUpdate,
    async (_event, id: unknown, input: unknown) =>
      deadlines().update(
        assertString(id, "deadlines:update", "Frist-ID", { minLength: 1, maxLength: 120 }),
        assertRecordInput<UpdateDeadlineInput>(input, "deadlines:update"),
      ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesComplete, async (_event, id: unknown, note?: unknown) =>
    deadlines().complete(
      assertString(id, "deadlines:complete", "Frist-ID", { minLength: 1, maxLength: 120 }),
      assertOptionalString(note, "deadlines:complete", "Notiz", { maxLength: 5_000 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesSuspend, async (_event, id: unknown, reason: unknown) =>
    deadlines().suspend(
      assertString(id, "deadlines:suspend", "Frist-ID", { minLength: 1, maxLength: 120 }),
      assertString(reason, "deadlines:suspend", "Grund", { minLength: 1, maxLength: 5_000 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.deadlinesCancel, async (_event, id: unknown, reason: unknown) =>
    deadlines().cancel(
      assertString(id, "deadlines:cancel", "Frist-ID", { minLength: 1, maxLength: 120 }),
      assertString(reason, "deadlines:cancel", "Grund", { minLength: 1, maxLength: 5_000 }),
    ),
  );
}
