import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type { UpdateRetentionSettingsInput } from "../../src/app/core/models/retention.model.js";
import { assertRecordInput, assertString } from "./ipcValidation.js";
import { assertCaseAnonymizationMode } from "../../services/caseAnonymizationPolicy.js";

export function registerRetentionIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const retention = services.retention;

  registerIpcHandler(ipcMain, IPC_CHANNELS.retentionDashboard, async () => retention.buildDashboard());
  registerIpcHandler(ipcMain, IPC_CHANNELS.retentionSettingsGet, async () => retention.getSettings());
  registerIpcHandler(ipcMain, IPC_CHANNELS.retentionSettingsUpdate, async (_event, input: unknown) =>
    retention.updateSettings(
      assertRecordInput<UpdateRetentionSettingsInput>(input, "retention:settings:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.retentionCaseAnonymize,
    async (_event, caseId: unknown, reason: unknown, confirmation: unknown, anonymizationMode: unknown) => {
      return services.caseAnonymization.anonymizeCase(
        assertString(caseId, "retention:case:anonymize", "Fall-ID", { minLength: 1, maxLength: 120 }),
        assertString(reason, "retention:case:anonymize", "Grund", { minLength: 1, maxLength: 5_000 }),
        assertString(confirmation, "retention:case:anonymize", "Bestätigung", { minLength: 1, maxLength: 200 }),
        assertCaseAnonymizationMode(anonymizationMode),
      );
    },
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.retentionCaseDelete,
    async (_event, caseId: unknown, reason: unknown, confirmation: unknown) =>
      retention.deleteCase(
        assertString(caseId, "retention:case:delete", "Fall-ID", { minLength: 1, maxLength: 120 }),
        assertString(reason, "retention:case:delete", "Grund", { minLength: 1, maxLength: 5_000 }),
        assertString(confirmation, "retention:case:delete", "Bestätigung", { minLength: 1, maxLength: 200 }),
      ),
  );
}
