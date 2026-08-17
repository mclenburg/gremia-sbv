import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { buildFromClosedJournalDeadline, buildFromContext, buildFromDeadline } from '../../services/activityJournalPrefill.js';
import type {
  ActivityJournalContextType,
  ActivityJournalExportOptions,
  ActivityJournalListFilter,
  ActivityJournalPrefillContext,
  ActivityJournalSummaryFilter,
  ActivityJournalLinkTarget,
  CreateActivityJournalEntryInput,
  UpdateActivityJournalEntryInput,
} from '../../src/domain/models/activity-journal.model.js';
import { assertAllowedEnum, assertRecordInput, assertString } from './ipcValidation.js';
import { ACTIVITY_JOURNAL_CATEGORIES, ACTIVITY_JOURNAL_CONTEXT_TYPES } from '../../src/domain/models/activity-journal.model.js';

export function registerActivityJournalIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const journal = services.activityJournal;
  const preferences = services.activityJournalPreferences;

  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalList, async (_event, filter: unknown) =>
    journal().listEntries((filter ?? {}) as ActivityJournalListFilter)
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalGet, async (_event, id: unknown) =>
    journal().getEntry(assertString(id, 'activityJournal:get', 'Journal-ID', { minLength: 1, maxLength: 120 })) ?? null
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalCreate, async (_event, input: unknown) =>
    journal().createEntry(assertRecordInput<CreateActivityJournalEntryInput>(input, 'activityJournal:create'))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalUpdate, async (_event, id: unknown, input: unknown) =>
    journal().updateEntry(
      assertString(id, 'activityJournal:update', 'Journal-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateActivityJournalEntryInput>(input, 'activityJournal:update')
    )
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalDelete, async (_event, id: unknown) =>
    journal().deleteEntry(assertString(id, 'activityJournal:delete', 'Journal-ID', { minLength: 1, maxLength: 120 }))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalLinksList, async (_event, entryId: unknown) =>
    journal().listLinks(assertString(entryId, 'activityJournal:links:list', 'Journal-ID', { minLength: 1, maxLength: 120 }))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalLinksAdd, async (_event, entryId: unknown, target: unknown) =>
    journal().addLink(
      assertString(entryId, 'activityJournal:links:add', 'Journal-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<ActivityJournalLinkTarget>(target, 'activityJournal:links:add', 'Bezug')
    )
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalLinksRemove, async (_event, entryId: unknown, linkId: unknown) =>
    journal().removeLink(
      assertString(entryId, 'activityJournal:links:remove', 'Journal-ID', { minLength: 1, maxLength: 120 }),
      assertString(linkId, 'activityJournal:links:remove', 'Link-ID', { minLength: 1, maxLength: 120 })
    )
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalSummary, async (_event, filter: unknown) =>
    journal().getSummary((filter ?? {}) as ActivityJournalSummaryFilter)
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalExport, async (_event, filter: unknown, mode: unknown, options: unknown) =>
    journal().exportEntries(
      (filter ?? {}) as ActivityJournalListFilter,
      mode === 'summary' ? 'summary' : 'detailed',
      (options ?? {}) as ActivityJournalExportOptions
    )
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalPrefillContext, async (_event, context: unknown) => {
    const validated = assertRecordInput<ActivityJournalPrefillContext>(context, 'activityJournal:prefill:context', 'Kontext');
    const preferredCategory = validated.category ? undefined : preferences().getPreferredCategory(validated.contextType);
    return buildFromContext({ ...validated, category: validated.category ?? preferredCategory });
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalPrefillDeadline, async (_event, deadline: unknown) =>
    buildFromDeadline(assertRecordInput(deadline, 'activityJournal:prefill:deadline', 'Frist'))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalPrefillClosedDeadline, async (_event, deadline: unknown) =>
    buildFromClosedJournalDeadline(assertRecordInput(deadline, 'activityJournal:prefill:closed-deadline', 'Frist'))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalPreferencesGet, async (_event, contextType: unknown) =>
    preferences().getPreferredCategory(assertAllowedEnum(contextType, 'activityJournal:preferences:get', 'Kontexttyp', ACTIVITY_JOURNAL_CONTEXT_TYPES))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.activityJournalPreferencesRemember, async (_event, contextType: unknown, category: unknown) =>
    preferences().rememberCategory(
      assertAllowedEnum(contextType, 'activityJournal:preferences:remember', 'Kontexttyp', ACTIVITY_JOURNAL_CONTEXT_TYPES) as ActivityJournalContextType,
      assertAllowedEnum(category, 'activityJournal:preferences:remember', 'Kategorie', ACTIVITY_JOURNAL_CATEGORIES)
    )
  );
}
