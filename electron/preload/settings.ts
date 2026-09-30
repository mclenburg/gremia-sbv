import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type { CompleteGremiaBrInformationRequestInput, CreateGremiaBrCaseSummaryInput, CreateGremiaBrExternalReferenceInput, CreateGremiaBrInformationRequestInput, CreateGremiaBrProcedureTaskInput, GremiaBrAgendaChanges, GremiaBrAgendaItemRequestResult, GremiaBrCachedOverview, GremiaBrCacheRefreshResult, GremiaBrConnectionTestResult, GremiaBrCreatedPdfDocument, GremiaBrDashboardOverview, GremiaBrDocumentDetail, GremiaBrDocumentHit, GremiaBrDocumentTransferResult, GremiaBrExternalReferenceRecord, GremiaBrGeneratedPdfDocument, GremiaBrInformationRequest, GremiaBrInlineSuggestion, GremiaBrOwnTaskDetail, GremiaBrProcedureDetail, GremiaBrPublicSettings, GremiaBrRelevanceSettings, GremiaBrSettingsInput, GremiaBrTaskTransitionInput, GremiaBrTaskTransitionOptions, GremiaBrWorkspaceActionRecord, GremiaBrWorkspaceBody, RequestGremiaBrAgendaItemInput, TransferGremiaBrDocumentInput } from "../../src/domain/models/gremia-br.model.js";
import type { TemplateDefaultValues } from "../../src/domain/models/template-default.model.js";
import type { CaseDocumentRecord } from "../../src/domain/models/case-document.model.js";
import type { GremiaBrDocumentImportInput } from "../../src/domain/models/gremia-br.model.js";
import type { TransferInstanceIdentity } from "../../src/domain/models/transfer-identity.model.js";
import type { SaveTransferRecipientProfileInput, TransferRecipientProfile } from "../../src/domain/models/transfer-recipient-profile.model.js";

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
      getOwnTaskDetail: (id: string): Promise<GremiaBrOwnTaskDetail> =>
        invokeIpc(IPC_CHANNELS.gremiaBrOwnTaskDetailGet, id),
      getMeetingRemoteAccess: (meetingId: string): Promise<string> =>
        invokeIpc(IPC_CHANNELS.gremiaBrMeetingRemoteAccessGet, meetingId),
      getMeetingAgendaChanges: (meetingId: string): Promise<GremiaBrAgendaChanges> =>
        invokeIpc(IPC_CHANNELS.gremiaBrMeetingAgendaChangesGet, meetingId),
      searchRemoteDocuments: (query: string): Promise<GremiaBrDocumentHit[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrRemoteDocumentsSearch, query),
      getRemoteDocumentDetail: (documentId: string): Promise<GremiaBrDocumentDetail> =>
        invokeIpc(IPC_CHANNELS.gremiaBrRemoteDocumentDetailGet, documentId),
      openRemoteDocumentVersion: (documentId: string, versionId: string): Promise<{ opened: boolean; error?: string }> =>
        invokeIpc(IPC_CHANNELS.gremiaBrRemoteDocumentVersionOpen, { documentId, versionId }),
      importRemoteDocumentVersion: (input: GremiaBrDocumentImportInput): Promise<CaseDocumentRecord> =>
        invokeIpc(IPC_CHANNELS.gremiaBrRemoteDocumentVersionImport, input),
      getOwnTaskTransitions: (id: string): Promise<GremiaBrTaskTransitionOptions> =>
        invokeIpc(IPC_CHANNELS.gremiaBrOwnTaskTransitionsGet, id),
      transitionOwnTask: (input: GremiaBrTaskTransitionInput): Promise<GremiaBrOwnTaskDetail> =>
        invokeIpc(IPC_CHANNELS.gremiaBrOwnTaskTransitionPost, input),
      getProcedureDetail: (id: string): Promise<GremiaBrProcedureDetail> =>
        invokeIpc(IPC_CHANNELS.gremiaBrProcedureDetailGet, id),
      listInformationRequests: (caseId: string, procedureId: string): Promise<GremiaBrInformationRequest[]> =>
        invokeIpc(IPC_CHANNELS.gremiaBrInformationRequestsList, caseId, procedureId),
      createInformationRequest: (input: CreateGremiaBrInformationRequestInput): Promise<GremiaBrInformationRequest> =>
        invokeIpc(IPC_CHANNELS.gremiaBrInformationRequestCreate, input),
      completeInformationRequest: (input: CompleteGremiaBrInformationRequestInput): Promise<GremiaBrInformationRequest> =>
        invokeIpc(IPC_CHANNELS.gremiaBrInformationRequestComplete, input),
      createProcedureTask: (input: CreateGremiaBrProcedureTaskInput): Promise<GremiaBrOwnTaskDetail> =>
        invokeIpc(IPC_CHANNELS.gremiaBrProcedureTaskCreate, input),
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
      listRecipientProfiles: (): Promise<TransferRecipientProfile[]> =>
        invokeIpc(IPC_CHANNELS.transferRecipientProfilesList),
      saveRecipientProfile: (input: SaveTransferRecipientProfileInput): Promise<TransferRecipientProfile> =>
        invokeIpc(IPC_CHANNELS.transferRecipientProfilesSave, input),
      setRecipientProfileActive: (id: string, active: boolean): Promise<TransferRecipientProfile> =>
        invokeIpc(IPC_CHANNELS.transferRecipientProfilesSetActive, id, active),
      deleteRecipientProfile: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.transferRecipientProfilesDelete, id),
    }
  } as const;
}
