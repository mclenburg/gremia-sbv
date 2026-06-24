import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import { ActivityJournalService } from '../../services/activityJournalService.js';
import { ActivityJournalPreferenceService } from '../../services/activityJournalPreferenceService.js';
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
} from '../../src/app/core/models/activity-journal.model.js';
import { assertAllowedEnum, assertRecordInput, assertString } from './ipcValidation.js';
import { ACTIVITY_JOURNAL_CATEGORIES, ACTIVITY_JOURNAL_CONTEXT_TYPES } from '../../src/app/core/models/activity-journal.model.js';

export function registerActivityJournalIpc(ipcMain: IpcMain, security: SecurityService): void {
  const journal = () => new ActivityJournalService(security.getActiveDatabase());
  const preferences = () => new ActivityJournalPreferenceService(security.getActiveDatabase());

  ipcMain.handle('activityJournal:list', async (_event, filter: unknown) =>
    journal().listEntries((filter ?? {}) as ActivityJournalListFilter)
  );
  ipcMain.handle('activityJournal:get', async (_event, id: unknown) =>
    journal().getEntry(assertString(id, 'activityJournal:get', 'Journal-ID', { minLength: 1, maxLength: 120 })) ?? null
  );
  ipcMain.handle('activityJournal:create', async (_event, input: unknown) =>
    journal().createEntry(assertRecordInput<CreateActivityJournalEntryInput>(input, 'activityJournal:create'))
  );
  ipcMain.handle('activityJournal:update', async (_event, id: unknown, input: unknown) =>
    journal().updateEntry(
      assertString(id, 'activityJournal:update', 'Journal-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateActivityJournalEntryInput>(input, 'activityJournal:update')
    )
  );
  ipcMain.handle('activityJournal:delete', async (_event, id: unknown) =>
    journal().deleteEntry(assertString(id, 'activityJournal:delete', 'Journal-ID', { minLength: 1, maxLength: 120 }))
  );
  ipcMain.handle('activityJournal:links:list', async (_event, entryId: unknown) =>
    journal().listLinks(assertString(entryId, 'activityJournal:links:list', 'Journal-ID', { minLength: 1, maxLength: 120 }))
  );
  ipcMain.handle('activityJournal:links:add', async (_event, entryId: unknown, target: unknown) =>
    journal().addLink(
      assertString(entryId, 'activityJournal:links:add', 'Journal-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<ActivityJournalLinkTarget>(target, 'activityJournal:links:add', 'Bezug')
    )
  );
  ipcMain.handle('activityJournal:links:remove', async (_event, entryId: unknown, linkId: unknown) =>
    journal().removeLink(
      assertString(entryId, 'activityJournal:links:remove', 'Journal-ID', { minLength: 1, maxLength: 120 }),
      assertString(linkId, 'activityJournal:links:remove', 'Link-ID', { minLength: 1, maxLength: 120 })
    )
  );
  ipcMain.handle('activityJournal:summary', async (_event, filter: unknown) =>
    journal().getSummary((filter ?? {}) as ActivityJournalSummaryFilter)
  );
  ipcMain.handle('activityJournal:export', async (_event, filter: unknown, mode: unknown, options: unknown) =>
    journal().exportEntries(
      (filter ?? {}) as ActivityJournalListFilter,
      mode === 'summary' ? 'summary' : 'detailed',
      (options ?? {}) as ActivityJournalExportOptions
    )
  );
  ipcMain.handle('activityJournal:prefill:context', async (_event, context: unknown) => {
    const validated = assertRecordInput<ActivityJournalPrefillContext>(context, 'activityJournal:prefill:context', 'Kontext');
    const preferredCategory = validated.category ? undefined : preferences().getPreferredCategory(validated.contextType);
    return buildFromContext({ ...validated, category: validated.category ?? preferredCategory });
  });
  ipcMain.handle('activityJournal:prefill:deadline', async (_event, deadline: unknown) =>
    buildFromDeadline(assertRecordInput(deadline, 'activityJournal:prefill:deadline', 'Frist'))
  );
  ipcMain.handle('activityJournal:prefill:closed-deadline', async (_event, deadline: unknown) =>
    buildFromClosedJournalDeadline(assertRecordInput(deadline, 'activityJournal:prefill:closed-deadline', 'Frist'))
  );
  ipcMain.handle('activityJournal:preferences:get', async (_event, contextType: unknown) =>
    preferences().getPreferredCategory(assertAllowedEnum(contextType, 'activityJournal:preferences:get', 'Kontexttyp', ACTIVITY_JOURNAL_CONTEXT_TYPES))
  );
  ipcMain.handle('activityJournal:preferences:remember', async (_event, contextType: unknown, category: unknown) =>
    preferences().rememberCategory(
      assertAllowedEnum(contextType, 'activityJournal:preferences:remember', 'Kontexttyp', ACTIVITY_JOURNAL_CONTEXT_TYPES) as ActivityJournalContextType,
      assertAllowedEnum(category, 'activityJournal:preferences:remember', 'Kategorie', ACTIVITY_JOURNAL_CATEGORIES)
    )
  );
}
