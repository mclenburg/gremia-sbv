import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type { CreateGremiaBrExternalReferenceInput, GremiaBrCachedOverview, GremiaBrCacheRefreshResult, GremiaBrConnectionTestResult, GremiaBrDashboardOverview, GremiaBrExternalReferenceRecord, GremiaBrInlineSuggestion, GremiaBrPublicSettings, GremiaBrRelevanceSettings, GremiaBrSettingsInput } from "../../src/app/core/models/gremia-br.model.js";
import type { TemplateDefaultValues } from "../../src/app/core/models/template-default.model.js";

export function createSettingsApi(invokeIpc: IpcInvoker) {
  return {
  gremiaBr: {
      getSettings: (): Promise<GremiaBrPublicSettings> =>
        invokeIpc(IPC_CHANNELS.gremiaBrSettingsGet),
      saveSettings: (input: GremiaBrSettingsInput): Promise<GremiaBrPublicSettings> =>
        invokeIpc(IPC_CHANNELS.gremiaBrSettingsSave, input),
      clearCredentials: (): Promise<GremiaBrPublicSettings> =>
        invokeIpc(IPC_CHANNELS.gremiaBrCredentialsClear),
      saveRelevanceSettings: (input: GremiaBrRelevanceSettings): Promise<GremiaBrPublicSettings> =>
        invokeIpc(IPC_CHANNELS.gremiaBrRelevanceSave, input),
      testConnection: (): Promise<GremiaBrConnectionTestResult> =>
        invokeIpc(IPC_CHANNELS.gremiaBrConnectionTest),
      getCachedOverview: (): Promise<GremiaBrCachedOverview> =>
        invokeIpc(IPC_CHANNELS.gremiaBrCacheGet),
      getDashboardOverview: (): Promise<GremiaBrDashboardOverview> =>
        invokeIpc(IPC_CHANNELS.gremiaBrDashboardGet),
      refreshCache: (): Promise<GremiaBrCacheRefreshResult> =>
        invokeIpc(IPC_CHANNELS.gremiaBrCacheRefresh),
      suggestInlineReferences: (query: string): Promise<GremiaBrInlineSuggestion[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrInlineSuggest, query),
      listExternalReferences: (caseId: string): Promise<GremiaBrExternalReferenceRecord[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrReferencesList, caseId),
      saveExternalReference: (input: CreateGremiaBrExternalReferenceInput): Promise<GremiaBrExternalReferenceRecord> =>
        invokeIpc(IPC_CHANNELS.gremiaBrReferencesCreate, input),
      deleteExternalReference: (referenceId: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.gremiaBrReferencesDelete, referenceId),
    },
  templateDefaults: {
      list: (): Promise<TemplateDefaultValues> =>
        invokeIpc(IPC_CHANNELS.templateDefaultsList),
      save: (values: TemplateDefaultValues): Promise<TemplateDefaultValues> =>
        invokeIpc(IPC_CHANNELS.templateDefaultsSave, values),
    }
  } as const;
}
