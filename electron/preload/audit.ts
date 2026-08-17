import type { IpcInvoker } from "./invoke.js";
import { IPC_CHANNELS } from "../ipc/channels.js";
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
import type {
  CreateDeadlineInput,
  DeadlineDashboardItem,
  DeadlineListFilters,
  DeadlineRecord,
  UpdateDeadlineInput,
} from "../../src/domain/models/deadline.model.js";

export function createAuditApi(invokeIpc: IpcInvoker) {
  return {
  activityJournal: {
      list: (filter?: ActivityJournalListFilter): Promise<ActivityJournalEntryRecord[]> =>
        invokeIpc(IPC_CHANNELS.activityJournalList, filter),
      get: (id: string): Promise<ActivityJournalEntryRecord | null> =>
        invokeIpc(IPC_CHANNELS.activityJournalGet, id),
      create: (input: CreateActivityJournalEntryInput): Promise<ActivityJournalEntryRecord> =>
        invokeIpc(IPC_CHANNELS.activityJournalCreate, input),
      update: (id: string, input: UpdateActivityJournalEntryInput): Promise<ActivityJournalEntryRecord> =>
        invokeIpc(IPC_CHANNELS.activityJournalUpdate, id, input),
      delete: (id: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.activityJournalDelete, id),
      listLinks: (entryId: string): Promise<ActivityJournalLinkRecord[]> =>
        invokeIpc(IPC_CHANNELS.activityJournalLinksList, entryId),
      addLink: (entryId: string, target: ActivityJournalLinkTarget): Promise<ActivityJournalLinkRecord> =>
        invokeIpc(IPC_CHANNELS.activityJournalLinksAdd, entryId, target),
      removeLink: (entryId: string, linkId: string): Promise<{ deleted: boolean }> =>
        invokeIpc(IPC_CHANNELS.activityJournalLinksRemove, entryId, linkId),
      summary: (filter?: ActivityJournalSummaryFilter): Promise<ActivityJournalSummary> =>
        invokeIpc(IPC_CHANNELS.activityJournalSummary, filter),
      export: (filter?: ActivityJournalListFilter, mode?: "summary" | "detailed", options?: ActivityJournalExportOptions): Promise<ActivityJournalExportResult> =>
        invokeIpc(IPC_CHANNELS.activityJournalExport, filter, mode, options),
      buildPrefillFromContext: (context: ActivityJournalPrefillContext): Promise<ActivityJournalPrefill> =>
        invokeIpc(IPC_CHANNELS.activityJournalPrefillContext, context),
      buildPrefillFromDeadline: (deadline: DeadlineRecord): Promise<ActivityJournalPrefill> =>
        invokeIpc(IPC_CHANNELS.activityJournalPrefillDeadline, deadline),
      buildPrefillFromClosedDeadline: (deadline: DeadlineRecord): Promise<ActivityJournalPrefill> =>
        invokeIpc(IPC_CHANNELS.activityJournalPrefillClosedDeadline, deadline),
      getPreferredCategory: (contextType: ActivityJournalPrefillContext["contextType"]): Promise<ActivityJournalCategoryPreferenceRecord["category"] | undefined> =>
        invokeIpc(IPC_CHANNELS.activityJournalPreferencesGet, contextType),
      rememberCategory: (contextType: ActivityJournalPrefillContext["contextType"], category: ActivityJournalCategoryPreferenceRecord["category"]): Promise<ActivityJournalCategoryPreferenceRecord> =>
        invokeIpc(IPC_CHANNELS.activityJournalPreferencesRemember, contextType, category),
    }
  } as const;
}
