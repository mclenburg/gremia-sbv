import type { IpcInvoker } from "./invoke.js";
import type { PrivacyReviewActionInput, PrivacyReviewActionResult, PrivacyReviewBulkResult, PrivacyReviewItemRecord } from "../../src/domain/models/privacy-review.model.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
import type {
  CreateSbvParticipationViolationInput,
  SbvParticipationViolationDocumentResult,
  SbvParticipationViolationEventRecord,
  SbvParticipationViolationFollowUpResult,
  SbvParticipationViolationGeneratedDocumentRecord,
  SbvParticipationViolationListFilter,
  SbvParticipationViolationRecord,
  SbvParticipationViolationStatusChangeInput,
  SbvParticipationViolationTemplateInput,
  SbvParticipationViolationTemplateValidationResult,
  UpdateSbvParticipationViolationInput,
} from "../../src/domain/models/sbv-participation-violation.model.js";
import type {
  ActivityJournalCategoryPreferenceRecord,
  ActivityJournalEntryRecord,
  ActivityJournalExportOptions,
  ActivityJournalExportResult,
  ActivityJournalLinkRecord,
  ActivityJournalLinkTarget,
  ActivityJournalListFilter,
  ActivityJournalPrefill,
  ActivityJournalPrefillContext,
  ActivityJournalSummary,
  ActivityJournalSummaryFilter,
  CreateActivityJournalEntryInput,
  UpdateActivityJournalEntryInput,
} from "../../src/domain/models/activity-journal.model.js";

export function createPrivacyApi(invokeIpc: IpcInvoker) {
  return {
  privacyReview: {
        listOpenForPerson: (protectedPersonId: string): Promise<PrivacyReviewItemRecord[]> =>
          invokeIpc(IPC_CHANNELS.privacyReviewListOpenForPerson, protectedPersonId),
        documentRetention: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
          invokeIpc(IPC_CHANNELS.privacyReviewDocumentRetention, input),
        scheduleLater: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
          invokeIpc(IPC_CHANNELS.privacyReviewScheduleLater, input),
        clearCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
          invokeIpc(IPC_CHANNELS.privacyReviewClearCase, input),
        anonymizeCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
          invokeIpc(IPC_CHANNELS.privacyReviewAnonymizeCase, input),
        deleteCase: (input: PrivacyReviewActionInput): Promise<PrivacyReviewActionResult> =>
          invokeIpc(IPC_CHANNELS.privacyReviewDeleteCase, input),
        bulkMarkClosedLegacy: (): Promise<PrivacyReviewBulkResult> =>
          invokeIpc(IPC_CHANNELS.privacyReviewBulkMarkClosedLegacy),
      },
  sbvParticipationViolations: {
        list: (filter?: SbvParticipationViolationListFilter): Promise<SbvParticipationViolationRecord[]> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsList, filter),
        get: (id: string): Promise<SbvParticipationViolationRecord | null> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsGet, id),
        listEvents: (id: string): Promise<SbvParticipationViolationEventRecord[]> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsEventsList, id),
        create: (input: CreateSbvParticipationViolationInput): Promise<SbvParticipationViolationRecord> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsCreate, input),
        update: (id: string, input: UpdateSbvParticipationViolationInput): Promise<SbvParticipationViolationRecord> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsUpdate, id, input),
        changeStatus: (id: string, input: SbvParticipationViolationStatusChangeInput): Promise<SbvParticipationViolationRecord> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsStatus, id, input),
        validateTemplate: (input: SbvParticipationViolationTemplateInput): Promise<SbvParticipationViolationTemplateValidationResult> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsTemplateValidate, input),
        generateDocument: (id: string, options?: Partial<Pick<SbvParticipationViolationTemplateInput, "recipientLabel" | "privacyMode" | "includeLegalReviewHint" | "includeOwiHint">>): Promise<SbvParticipationViolationDocumentResult> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsDocumentsGenerate, id, options),
        listDocuments: (id: string): Promise<SbvParticipationViolationGeneratedDocumentRecord[]> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsDocumentsList, id),
        createFollowUp: (id: string, dueAt?: string): Promise<SbvParticipationViolationFollowUpResult> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsFollowUpCreate, id, dueAt),
        buildJournalPrefill: (id: string): Promise<ActivityJournalPrefill> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsJournalPrefill, id),
        delete: (id: string): Promise<{ deleted: boolean }> =>
          invokeIpc(IPC_CHANNELS.sbvParticipationViolationsDelete, id),
      }
  } as const;
}
