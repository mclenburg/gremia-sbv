import type { IpcInvoker } from "./invoke.js";
import type { CreateSbvResourceRecordInput, SbvResourceDashboardSummary, SbvResourceRecord, UpdateSbvResourceRecordInput } from "../../src/domain/models/sbv-resource.model.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type { CreateSbvControlProtocolInput, SbvControlProtocolRecord, UpdateSbvControlProtocolInput } from "../../src/domain/models/sbv-control-protocol.model.js";
import type { CaseAnonymizationMode } from "../../src/domain/models/privacy-review.model.js";
import type { ComplianceAuditChainStatus, ComplianceDatabaseIntegrityStatus, ComplianceIncidentRecord, ComplianceSelfCheckResult, CreateComplianceIncidentInput, DataSubjectAccessPrefill, DataSubjectAccessRequestInput, UpdateComplianceIncidentInput } from "../../src/domain/models/compliance.model.js";
import type {
  RetentionDashboard,
  RetentionOperationResult,
  RetentionSettings,
  UpdateRetentionSettingsInput,
} from "../../src/domain/models/retention.model.js";

export function createGovernanceApi(invokeIpc: IpcInvoker) {
  return {
  sbvResources: {
        list: (): Promise<SbvResourceRecord[]> => invokeIpc(IPC_CHANNELS.sbvResourcesList),
        dashboard: (): Promise<SbvResourceDashboardSummary> => invokeIpc(IPC_CHANNELS.sbvResourcesDashboard),
        create: (input: CreateSbvResourceRecordInput): Promise<SbvResourceRecord> => invokeIpc(IPC_CHANNELS.sbvResourcesCreate, input),
        update: (id: string, input: UpdateSbvResourceRecordInput): Promise<SbvResourceRecord> => invokeIpc(IPC_CHANNELS.sbvResourcesUpdate, id, input),
        delete: (id: string): Promise<{ deleted: boolean }> => invokeIpc(IPC_CHANNELS.sbvResourcesDelete, id),
      },
  sbvControlProtocols: {
        list: (): Promise<SbvControlProtocolRecord[]> => invokeIpc(IPC_CHANNELS.sbvControlProtocolsList),
        create: (input: CreateSbvControlProtocolInput): Promise<SbvControlProtocolRecord> => invokeIpc(IPC_CHANNELS.sbvControlProtocolsCreate, input),
        update: (id: string, input: UpdateSbvControlProtocolInput): Promise<SbvControlProtocolRecord> => invokeIpc(IPC_CHANNELS.sbvControlProtocolsUpdate, id, input),
        delete: (id: string): Promise<{ deleted: boolean }> => invokeIpc(IPC_CHANNELS.sbvControlProtocolsDelete, id),
      },
  compliance: {
        auditChainStatus: (): Promise<ComplianceAuditChainStatus> =>
          invokeIpc(IPC_CHANNELS.complianceAuditChainStatus),
        databaseIntegrityStatus: (): Promise<ComplianceDatabaseIntegrityStatus> =>
          invokeIpc(IPC_CHANNELS.complianceDatabaseIntegrityStatus),
        prefillDsar: (input: DataSubjectAccessRequestInput): Promise<DataSubjectAccessPrefill> =>
          invokeIpc(IPC_CHANNELS.complianceDsarPrefill, input),
        selfCheck: (): Promise<ComplianceSelfCheckResult> =>
          invokeIpc(IPC_CHANNELS.complianceSelfCheck),
        listIncidents: (): Promise<ComplianceIncidentRecord[]> =>
          invokeIpc(IPC_CHANNELS.complianceIncidentsList),
        createIncident: (input: CreateComplianceIncidentInput): Promise<ComplianceIncidentRecord> =>
          invokeIpc(IPC_CHANNELS.complianceIncidentsCreate, input),
        updateIncident: (id: string, input: UpdateComplianceIncidentInput): Promise<ComplianceIncidentRecord> =>
          invokeIpc(IPC_CHANNELS.complianceIncidentsUpdate, id, input),
      },
  retention: {
        dashboard: (): Promise<RetentionDashboard> =>
          invokeIpc(IPC_CHANNELS.retentionDashboard),
        getSettings: (): Promise<RetentionSettings> =>
          invokeIpc(IPC_CHANNELS.retentionSettingsGet),
        updateSettings: (
          input: UpdateRetentionSettingsInput,
        ): Promise<RetentionSettings> =>
          invokeIpc(IPC_CHANNELS.retentionSettingsUpdate, input),
        anonymizeCase: (
          caseId: string,
          reason: string,
          confirmation: string,
          anonymizationMode: CaseAnonymizationMode,
        ): Promise<RetentionOperationResult> =>
          invokeIpc(
            IPC_CHANNELS.retentionCaseAnonymize,
            caseId,
            reason,
            confirmation,
            anonymizationMode,
          ),
        deleteCase: (
          caseId: string,
          reason: string,
          confirmation: string,
        ): Promise<RetentionOperationResult> =>
          invokeIpc(IPC_CHANNELS.retentionCaseDelete, caseId, reason, confirmation),
      }
  } as const;
}
