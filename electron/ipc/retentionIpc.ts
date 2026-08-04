import { registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type { UpdateRetentionSettingsInput } from "../../src/app/core/models/retention.model.js";
import { assertRecordInput, assertString } from "./ipcValidation.js";

export function registerRetentionIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const retention = services.retention;

  registerIpcHandler(ipcMain, "retention:dashboard", async () => retention.buildDashboard());
  registerIpcHandler(ipcMain, "retention:settings:get", async () => retention.getSettings());
  registerIpcHandler(ipcMain, "retention:settings:update", async (_event, input: unknown) =>
    retention.updateSettings(
      assertRecordInput<UpdateRetentionSettingsInput>(input, "retention:settings:update"),
    ),
  );
  registerIpcHandler(ipcMain, 
    "retention:case:anonymize",
    async (_event, caseId: unknown, reason: unknown, confirmation: unknown) =>
      retention.anonymizeCase(
        assertString(caseId, "retention:case:anonymize", "Fall-ID", { minLength: 1, maxLength: 120 }),
        assertString(reason, "retention:case:anonymize", "Grund", { minLength: 1, maxLength: 5_000 }),
        assertString(confirmation, "retention:case:anonymize", "Bestätigung", { minLength: 1, maxLength: 200 }),
      ),
  );
  registerIpcHandler(ipcMain, 
    "retention:case:delete",
    async (_event, caseId: unknown, reason: unknown, confirmation: unknown) =>
      retention.deleteCase(
        assertString(caseId, "retention:case:delete", "Fall-ID", { minLength: 1, maxLength: 120 }),
        assertString(reason, "retention:case:delete", "Grund", { minLength: 1, maxLength: 5_000 }),
        assertString(confirmation, "retention:case:delete", "Bestätigung", { minLength: 1, maxLength: 200 }),
      ),
  );
}
