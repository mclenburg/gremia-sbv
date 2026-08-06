import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  CreateRecruitingInterviewEventInput,
  CreateRecruitingParticipationInput,
  RecruitingInterviewEventRecord,
  RecruitingParticipationRecord,
  UpdateRecruitingInterviewEventInput,
  UpdateRecruitingParticipationInput,
} from "../../src/app/core/models/recruiting-participation.model.js";

export function createRecruitingApi(invokeIpc: IpcInvoker) {
  return {
  recruitingParticipations: {
      list: (): Promise<RecruitingParticipationRecord[]> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsList),
      get: (id: string): Promise<RecruitingParticipationRecord | null> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsGet, id),
      create: (input: CreateRecruitingParticipationInput): Promise<RecruitingParticipationRecord> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsCreate, input),
      update: (id: string, input: UpdateRecruitingParticipationInput): Promise<RecruitingParticipationRecord> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsUpdate, id, input),
      delete: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsDelete, id),
      listInterviews: (recruitingParticipationId: string): Promise<RecruitingInterviewEventRecord[]> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsInterviewsList, recruitingParticipationId),
      addInterview: (input: CreateRecruitingInterviewEventInput): Promise<RecruitingInterviewEventRecord> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsInterviewsCreate, input),
      updateInterview: (id: string, input: UpdateRecruitingInterviewEventInput): Promise<RecruitingInterviewEventRecord> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsInterviewsUpdate, id, input),
      deleteInterview: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.recruitingParticipationsInterviewsDelete, id),
    }
  } as const;
}
