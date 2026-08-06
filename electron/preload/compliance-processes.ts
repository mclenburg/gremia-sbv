import type { IpcInvoker } from "./invoke.js";
import type {
  CreatePreventionProcessInput,
  PreventionDashboardSummary,
  PreventionProcessRecord,
  PreventionStepDefinition,
  PreventionWarning,
  UpdatePreventionProcessInput,
} from "../../src/app/core/models/prevention.model.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  CreateParticipationInput,
  ParticipationDashboardSummary,
  ParticipationRecord,
  ParticipationWarning,
  UpdateParticipationInput,
} from "../../src/app/core/models/participation.model.js";
import type {
  CreateWorkplaceAccommodationInput,
  UpdateWorkplaceAccommodationInput,
  WorkplaceAccommodationDashboardSummary,
  WorkplaceAccommodationRecord,
  WorkplaceAccommodationWarning,
} from "../../src/app/core/models/workplace-accommodation.model.js";
import type {
  BemDashboardSummary,
  BemProcessRecord,
  BemStepDefinition,
  BemWarning,
  CreateBemProcessInput,
  UpdateBemProcessInput,
} from "../../src/app/core/models/bem.model.js";
import type {
  CreateEqualizationProcessInput,
  EqualizationProcessRecord,
  EqualizationWarning,
  UpdateEqualizationProcessInput,
} from "../../src/app/core/models/equalization.model.js";
import type {
  CreateTerminationHearingInput,
  TerminationHearingRecord,
  TerminationHearingWarning,
  UpdateTerminationHearingInput,
} from "../../src/app/core/models/termination.model.js";

export function createProcessesApi(invokeIpc: IpcInvoker) {
  return {
  prevention: {
          steps: (): Promise<PreventionStepDefinition[]> =>
            invokeIpc(IPC_CHANNELS.preventionSteps),
          list: (caseId?: string): Promise<PreventionProcessRecord[]> =>
            invokeIpc(IPC_CHANNELS.preventionList, caseId),
          dashboard: (): Promise<PreventionDashboardSummary> =>
            invokeIpc(IPC_CHANNELS.preventionDashboard),
          create: (
            input: CreatePreventionProcessInput,
          ): Promise<PreventionProcessRecord> =>
            invokeIpc(IPC_CHANNELS.preventionCreate, input),
          update: (
            id: string,
            input: UpdatePreventionProcessInput,
          ): Promise<PreventionProcessRecord> =>
            invokeIpc(IPC_CHANNELS.preventionUpdate, id, input),
          warnings: (id: string): Promise<PreventionWarning[]> =>
            invokeIpc(IPC_CHANNELS.preventionWarnings, id),
        },
  participation: {
          list: (caseId?: string): Promise<ParticipationRecord[]> =>
            invokeIpc(IPC_CHANNELS.participationList, caseId),
          dashboard: (): Promise<ParticipationDashboardSummary> =>
            invokeIpc(IPC_CHANNELS.participationDashboard),
          create: (input: CreateParticipationInput): Promise<ParticipationRecord> =>
            invokeIpc(IPC_CHANNELS.participationCreate, input),
          update: (
            id: string,
            input: UpdateParticipationInput,
          ): Promise<ParticipationRecord> =>
            invokeIpc(IPC_CHANNELS.participationUpdate, id, input),
          warnings: (id: string): Promise<ParticipationWarning[]> =>
            invokeIpc(IPC_CHANNELS.participationWarnings, id),
        },
  workplaceAccommodation: {
          list: (caseId?: string): Promise<WorkplaceAccommodationRecord[]> =>
            invokeIpc(IPC_CHANNELS.workplaceAccommodationList, caseId),
          dashboard: (): Promise<WorkplaceAccommodationDashboardSummary> =>
            invokeIpc(IPC_CHANNELS.workplaceAccommodationDashboard),
          create: (input: CreateWorkplaceAccommodationInput): Promise<WorkplaceAccommodationRecord> =>
            invokeIpc(IPC_CHANNELS.workplaceAccommodationCreate, input),
          update: (
            id: string,
            input: UpdateWorkplaceAccommodationInput,
          ): Promise<WorkplaceAccommodationRecord> =>
            invokeIpc(IPC_CHANNELS.workplaceAccommodationUpdate, id, input),
          warnings: (id: string): Promise<WorkplaceAccommodationWarning[]> =>
            invokeIpc(IPC_CHANNELS.workplaceAccommodationWarnings, id),
        },
  bem: {
          steps: (): Promise<BemStepDefinition[]> => invokeIpc(IPC_CHANNELS.bemSteps),
          list: (caseId?: string): Promise<BemProcessRecord[]> =>
            invokeIpc(IPC_CHANNELS.bemList, caseId),
          dashboard: (): Promise<BemDashboardSummary> =>
            invokeIpc(IPC_CHANNELS.bemDashboard),
          create: (input: CreateBemProcessInput): Promise<BemProcessRecord> =>
            invokeIpc(IPC_CHANNELS.bemCreate, input),
          update: (
            id: string,
            input: UpdateBemProcessInput,
          ): Promise<BemProcessRecord> => invokeIpc(IPC_CHANNELS.bemUpdate, id, input),
          warnings: (id: string): Promise<BemWarning[]> =>
            invokeIpc(IPC_CHANNELS.bemWarnings, id),
        },
  equalization: {
          steps: (): Promise<string[]> => invokeIpc(IPC_CHANNELS.equalizationSteps),
          list: (caseId?: string): Promise<EqualizationProcessRecord[]> =>
            invokeIpc(IPC_CHANNELS.equalizationList, caseId),
          create: (
            input: CreateEqualizationProcessInput,
          ): Promise<EqualizationProcessRecord> =>
            invokeIpc(IPC_CHANNELS.equalizationCreate, input),
          update: (
            id: string,
            input: UpdateEqualizationProcessInput,
          ): Promise<EqualizationProcessRecord> =>
            invokeIpc(IPC_CHANNELS.equalizationUpdate, id, input),
          warnings: (id: string): Promise<EqualizationWarning[]> =>
            invokeIpc(IPC_CHANNELS.equalizationWarnings, id),
        },
  termination: {
          steps: (): Promise<string[]> => invokeIpc(IPC_CHANNELS.terminationSteps),
          list: (caseId?: string): Promise<TerminationHearingRecord[]> =>
            invokeIpc(IPC_CHANNELS.terminationList, caseId),
          create: (
            input: CreateTerminationHearingInput,
          ): Promise<TerminationHearingRecord> =>
            invokeIpc(IPC_CHANNELS.terminationCreate, input),
          update: (
            id: string,
            input: UpdateTerminationHearingInput,
          ): Promise<TerminationHearingRecord> =>
            invokeIpc(IPC_CHANNELS.terminationUpdate, id, input),
          warnings: (id: string): Promise<TerminationHearingWarning[]> =>
            invokeIpc(IPC_CHANNELS.terminationWarnings, id),
        }
  } as const;
}
