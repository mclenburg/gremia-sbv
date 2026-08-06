import { createSecurityApi } from "./security.js";
import { createCasesApi } from "./cases.js";
import { createComplianceApi } from "./compliance.js";
import { createPersonsApi } from "./persons.js";
import { createRecruitingApi } from "./recruiting.js";
import { createDocumentsApi } from "./documents.js";
import { createSettingsApi } from "./settings.js";
import { createTemplatesApi } from "./templates.js";
import { createBackupApi } from "./backup.js";
import { createAuditApi } from "./audit.js";
import type { IpcInvoker } from "./invoke.js";
import { deepFreeze } from "./freeze.js";

export function createPreloadApi(invokeIpc: IpcInvoker, loadedAt = new Date().toISOString()) {
  return deepFreeze({
    ...createSecurityApi(invokeIpc),
    ...createCasesApi(invokeIpc),
    ...createComplianceApi(invokeIpc),
    ...createPersonsApi(invokeIpc),
    ...createRecruitingApi(invokeIpc),
    ...createDocumentsApi(invokeIpc),
    ...createSettingsApi(invokeIpc),
    ...createTemplatesApi(invokeIpc),
    ...createBackupApi(invokeIpc),
    ...createAuditApi(invokeIpc),
    diagnostics: Object.freeze({ bridgeReady: true, preloadLoadedAt: loadedAt }),
  });
}

export type GremiaSbvPreloadApi = ReturnType<typeof createPreloadApi>;
