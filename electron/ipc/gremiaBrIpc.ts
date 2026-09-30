import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { GremiaBrHttpReadAdapter } from '../../services/gremiaBr/gremiaBrHttpReadAdapter.js';
import { GremiaBrTaskService } from '../../services/gremiaBr/gremiaBrTaskService.js';
import { GremiaBrMeetingAccessService } from '../../services/gremiaBr/gremiaBrMeetingAccessService.js';
import { GremiaBrHttpError } from '../../services/gremiaBr/gremiaBrHttpClient.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { GremiaBrV2WorkspaceService } from '../../services/gremiaBr/gremiaBrV2WorkspaceService.js';
import type {
  CreateGremiaBrCaseSummaryInput,
  GremiaBrRelevanceSettings,
  GremiaBrSettingsInput,
  RequestGremiaBrAgendaItemInput,
  TransferGremiaBrDocumentInput,
} from '../../src/domain/models/gremia-br.model.js';
import { assertPlainObject, assertRecordInput, assertString, IpcValidationError } from './ipcValidation.js';
import { registerGremiaBrReferenceIpc } from './gremiaBrReferenceIpc.js';
import { registerGremiaBrDocumentReadIpc } from './gremiaBrDocumentReadIpc.js';
import { registerGremiaBrOwnShareIpc } from './gremiaBrOwnShareIpc.js';
import { GremiaBrStartupRefreshService } from '../../services/gremiaBr/gremiaBrStartupRefreshService.js';

export function registerGremiaBrIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const settings = services.gremiaBrSettings;
  const auth = services.gremiaBrAuth;
  const cache = services.gremiaBrCache;
  const workspace = new GremiaBrV2WorkspaceService(auth);
  const startupRefresh = new GremiaBrStartupRefreshService(settings, auth, cache);
  function ownTaskId(rawId: unknown, channel: string): string {
    const id = assertString(rawId, channel, 'Aufgaben-ID', { minLength: 1, maxLength: 120 });
    if (!cache.getOverview().ownTasks.some((task) => task.id === id)) {
      throw new ApplicationError('NOT_FOUND', 'Diese Aufgabe gehört nicht zum aktuellen eigenen Arbeitsstand. Bitte Gremia.BR erneut aktualisieren.');
    }
    return id;
  }

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrSettingsGet, async () => settings.getPublicSettings());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrSettingsSave, async (_event, input: unknown) => {
    auth.clearToken();
    const saved = settings.saveSettings(assertRecordInput<GremiaBrSettingsInput>(input, 'gremia-br:settings:save'));
    cache.clear();
    return saved;
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrRelevanceSave, async (_event, input: unknown) => {
    return settings.saveRelevanceSettings(assertRecordInput<GremiaBrRelevanceSettings>(input, 'gremia-br:relevance:save'));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCredentialsClear, async () => {
    auth.clearToken();
    const next = settings.clearCredentials();
    cache.clear();
    return next;
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrConnectionTest, async () => auth.testConnection());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrWorkspaceBodiesList, async () => workspace.listSbvWorkspaceBodies());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrDocumentsList, async (_event, limit: unknown) => {
    return services.gremiaBrWorkspaceActions().listTransferableDocuments(typeof limit === 'number' ? limit : undefined);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrWorkspaceActionsList, async (_event, limit: unknown) => {
    return services.gremiaBrWorkspaceActions().listActionHistory(typeof limit === 'number' ? limit : undefined);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCaseSummaryCreate, async (_event, input: unknown) => {
    return services.gremiaBrWorkspaceActions().createCaseSummaryDocument(assertRecordInput<CreateGremiaBrCaseSummaryInput>(input, 'gremia-br:case-summary:create'));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrDocumentTransfer, async (_event, input: unknown) => {
    return services.gremiaBrWorkspaceActions().transferGeneratedPdf(assertRecordInput<TransferGremiaBrDocumentInput>(input, 'gremia-br:documents:transfer'));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrAgendaItemRequest, async (_event, input: unknown) => {
    return services.gremiaBrWorkspaceActions().requestAgendaItem(assertRecordInput<RequestGremiaBrAgendaItemInput>(input, 'gremia-br:agenda:item-request'));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCacheGet, async () => cache.getOverview());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrDashboardGet, async () => cache.getDashboardOverview(settings.getRelevanceSettings()));

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCacheRefresh, async () => {
    const result = await cache.refresh(new GremiaBrHttpReadAdapter(auth));
    return {
      ...result,
      cached: cache.getDashboardOverview(settings.getRelevanceSettings()),
    };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrStartupRefresh, async () => startupRefresh.run());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrOwnTaskDetailGet, async (_event, rawId: unknown) => {
    const id = ownTaskId(rawId, 'gremia-br:own-task:detail:get');
    return new GremiaBrHttpReadAdapter(auth).getOwnTaskDetail(id);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrMeetingRemoteAccessGet, async (_event, rawId: unknown) => {
    const channel = 'gremia-br:meeting:remote-access:get';
    const id = assertString(rawId, channel, 'Sitzungs-ID', { minLength: 1, maxLength: 120 });
    return new GremiaBrMeetingAccessService(auth).getAccess(id, cache.getOverview());
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrMeetingAgendaChangesGet, async (_event, rawId: unknown) => {
    const channel = 'gremia-br:meeting:agenda-changes:get';
    const id = assertString(rawId, channel, 'Sitzungs-ID', { minLength: 1, maxLength: 120 });
    return new GremiaBrMeetingAccessService(auth).getAgendaChanges(id, cache.getOverview());
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrOwnTaskTransitionsGet, async (_event, rawId: unknown) => {
    const id = ownTaskId(rawId, 'gremia-br:own-task:transitions:get');
    return new GremiaBrTaskService(auth).getTransitionOptions(id);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrOwnTaskTransitionPost, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:own-task:transition:post';
    const input = assertPlainObject(rawInput, channel);
    const id = ownTaskId(input.taskId, channel);
    const to = assertString(input.to, channel, 'Zielstatus', { minLength: 1, maxLength: 40 });
    const version = input.expectedVersion;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
      throw new IpcValidationError(channel, 'Aufgabenversion ist ungültig.');
    }
    try {
      return await new GremiaBrTaskService(auth).transition(id, to, version);
    } catch (error) {
      if (error instanceof GremiaBrHttpError && error.status === 409) {
        throw new ApplicationError('CONFLICT', 'Die Aufgabe wurde zwischenzeitlich geändert. Bitte die Details bewusst neu laden und erneut prüfen.');
      }
      if (error instanceof GremiaBrHttpError && error.status === 403) {
        throw new ApplicationError('PERMISSION_DENIED', 'Gremia.BR erlaubt diese Statusänderung nicht. Bitte den eigenen Zugriff dort prüfen.');
      }
      throw error;
    }
  });

  registerGremiaBrReferenceIpc(ipcMain, services);
  registerGremiaBrDocumentReadIpc(ipcMain, auth, security, services.cases);
  registerGremiaBrOwnShareIpc(ipcMain, auth, () => security.getActiveDatabase());
}
