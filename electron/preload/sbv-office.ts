import type { ActivityJournalPrefill } from '../../src/app/core/models/activity-journal.model.js';
import type {
  ComplaintWorkflowRecord,
  CreateSbvMeetingInput,
  EmployerObligationReviewRecord,
  InclusionAgreementRecord,
  InclusionAgreementTopicRecord,
  InclusionOfficerSnapshotRecord,
  QuickCaseTemplate,
  SaveComplaintWorkflowInput,
  SaveEmployerObligationReviewInput,
  SaveInclusionAgreementInput,
  SaveInclusionAgreementTopicInput,
  SaveInclusionOfficerSnapshotInput,
  SaveSbvAssemblyInput,
  SbvAssemblyRecord,
  SbvMeetingAgendaItemRecord,
  SbvMeetingRecord,
  UpdateSbvMeetingInput,
  UpsertSbvMeetingAgendaInput,
} from '../../src/app/core/models/sbv-office-workflow.model.js';
import type { SbvOfficeDocumentRecord } from '../../services/sbvOfficeWorkflowDocumentAdapter.js';
import { IPC_CHANNELS } from '../ipc/channels.js';
import type { IpcInvoker } from './invoke.js';

export function createSbvOfficeApi(invokeIpc: IpcInvoker) {
  return {
    sbvOffice: {
      meetings: {
        list: (): Promise<SbvMeetingRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeMeetingsList),
        create: (input: CreateSbvMeetingInput): Promise<SbvMeetingRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeMeetingsCreate, input),
        update: (id: string, input: UpdateSbvMeetingInput): Promise<SbvMeetingRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeMeetingsUpdate, id, input),
        journalPrefill: (id: string, activity: 'attendance' | 'preparation' | 'top_request' | 'suspension'): Promise<ActivityJournalPrefill> => invokeIpc(IPC_CHANNELS.sbvOfficeMeetingsJournalPrefill, id, activity),
        saveAgenda: (id: string, input: UpsertSbvMeetingAgendaInput): Promise<SbvMeetingAgendaItemRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeMeetingsAgendaSave, id, input),
        createAgendaFollowUp: (agendaId: string, dueAt: string, title?: string): Promise<unknown> => invokeIpc(IPC_CHANNELS.sbvOfficeMeetingsAgendaFollowUp, agendaId, dueAt, title),
      },
      assemblies: {
        list: (): Promise<SbvAssemblyRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeAssembliesList),
        annualWarning: (year: number): Promise<boolean> => invokeIpc(IPC_CHANNELS.sbvOfficeAssembliesAnnualWarning, year),
        createFollowUp: (id: string, dueAt: string, title?: string): Promise<unknown> => invokeIpc(IPC_CHANNELS.sbvOfficeAssembliesCreateFollowUp, id, dueAt, title),
        generateDocument: (id: string, kind: 'invitation' | 'agenda' | 'activity_report_draft' | 'result_minutes'): Promise<SbvOfficeDocumentRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeAssembliesGenerateDocument, id, kind),
        save: (input: SaveSbvAssemblyInput): Promise<SbvAssemblyRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeAssembliesSave, input),
      },
      obligations: {
        list: (): Promise<EmployerObligationReviewRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeObligationsList),
        ensureAnnual: (year: number): Promise<EmployerObligationReviewRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeObligationsEnsureAnnual, year),
        save: (input: SaveEmployerObligationReviewInput): Promise<EmployerObligationReviewRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeObligationsSave, input),
      },
      officers: {
        list: (): Promise<InclusionOfficerSnapshotRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeOfficersList),
        save: (input: SaveInclusionOfficerSnapshotInput): Promise<InclusionOfficerSnapshotRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeOfficersSave, input),
      },
      agreements: {
        list: (): Promise<InclusionAgreementRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeAgreementsList),
        requestDraft: (dueAt?: string): Promise<{ text: string; responseDueAt?: string }> => invokeIpc(IPC_CHANNELS.sbvOfficeAgreementsRequestDraft, dueAt),
        createResponseDeadline: (id: string, dueAt: string): Promise<unknown> => invokeIpc(IPC_CHANNELS.sbvOfficeAgreementsResponseDeadline, id, dueAt),
        save: (input: SaveInclusionAgreementInput): Promise<InclusionAgreementRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeAgreementsSave, input),
        saveTopic: (id: string, input: SaveInclusionAgreementTopicInput): Promise<InclusionAgreementTopicRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeAgreementsTopicSave, id, input),
      },
      documents: {
        selectAndAttach: (ownerType: 'meeting' | 'assembly' | 'inclusion_agreement' | 'employer_obligation_review', ownerId: string, purpose: string): Promise<SbvOfficeDocumentRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeDocumentsSelectAndAttach, { ownerType, ownerId, purpose }),
      },
      complaints: {
        list: (): Promise<ComplaintWorkflowRecord[]> => invokeIpc(IPC_CHANNELS.sbvOfficeComplaintsList),
        save: (input: SaveComplaintWorkflowInput): Promise<ComplaintWorkflowRecord> => invokeIpc(IPC_CHANNELS.sbvOfficeComplaintsSave, input),
        templates: (): Promise<QuickCaseTemplate[]> => invokeIpc(IPC_CHANNELS.sbvOfficeComplaintsTemplates),
      },
    },
  } as const;
}
