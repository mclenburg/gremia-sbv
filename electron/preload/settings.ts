import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type { CreateGremiaBrCaseSummaryInput, CreateGremiaBrExternalReferenceInput, GremiaBrAgendaItemRequestResult, GremiaBrCachedOverview, GremiaBrCacheRefreshResult, GremiaBrConnectionTestResult, GremiaBrCreatedPdfDocument, GremiaBrDashboardOverview, GremiaBrDocumentTransferResult, GremiaBrExternalReferenceRecord, GremiaBrGeneratedPdfDocument, GremiaBrInlineSuggestion, GremiaBrPublicSettings, GremiaBrRelevanceSettings, GremiaBrSettingsInput, GremiaBrWorkspaceActionRecord, GremiaBrWorkspaceBody, RequestGremiaBrAgendaItemInput, TransferGremiaBrDocumentInput } from "../../src/domain/models/gremia-br.model.js";
import type { TemplateDefaultValues } from "../../src/domain/models/template-default.model.js";
import type { TransferInstanceIdentity } from "../../src/domain/models/transfer-identity.model.js";

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
      listWorkspaceBodies: (): Promise<GremiaBrWorkspaceBody[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrWorkspaceBodiesList),
      listTransferableDocuments: (limit?: number): Promise<GremiaBrGeneratedPdfDocument[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrDocumentsList, limit),
      listWorkspaceActions: (limit?: number): Promise<GremiaBrWorkspaceActionRecord[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrWorkspaceActionsList, limit),
      createCaseSummaryDocument: (input: CreateGremiaBrCaseSummaryInput): Promise<GremiaBrCreatedPdfDocument> =>
        invokeIpc(IPC_CHANNELS.gremiaBrCaseSummaryCreate, input),
      transferGeneratedPdf: (input: TransferGremiaBrDocumentInput): Promise<GremiaBrDocumentTransferResult> =>
        invokeIpc(IPC_CHANNELS.gremiaBrDocumentTransfer, input),
      requestAgendaItem: (input: RequestGremiaBrAgendaItemInput): Promise<GremiaBrAgendaItemRequestResult> =>
        invokeIpc(IPC_CHANNELS.gremiaBrAgendaItemRequest, input),
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
    },
  transferIdentity: {
      get: (): Promise<TransferInstanceIdentity> =>
        invokeIpc(IPC_CHANNELS.transferIdentityGet),
    }
  } as const;
}
