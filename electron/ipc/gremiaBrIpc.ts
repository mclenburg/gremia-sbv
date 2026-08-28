import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { GremiaBrHttpReadAdapter } from '../../services/gremiaBr/gremiaBrHttpReadAdapter.js';
import { GremiaBrV2WorkspaceService } from '../../services/gremiaBr/gremiaBrV2WorkspaceService.js';
import type { CreateGremiaBrExternalReferenceInput, GremiaBrRelevanceSettings, GremiaBrSettingsInput } from '../../src/domain/models/gremia-br.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerGremiaBrIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const settings = services.gremiaBrSettings;
  const auth = services.gremiaBrAuth;
  const cache = services.gremiaBrCache;
  const adapter = new GremiaBrHttpReadAdapter(auth);
  const workspace = new GremiaBrV2WorkspaceService(auth);
  const references = services.gremiaBrReferences;

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrSettingsGet, async () => settings.getPublicSettings());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrSettingsSave, async (_event, input: unknown) => {
    auth.clearToken();
    const saved = settings.saveSettings(assertRecordInput<GremiaBrSettingsInput>(input, 'gremia-br:settings:save'));
    if (!saved.enabled) cache.clear();
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

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCacheGet, async () => cache.getOverview());

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrDashboardGet, async () => cache.getDashboardOverview(settings.getRelevanceSettings()));

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCacheRefresh, async () => {
    const result = await cache.refresh(adapter);
    return {
      ...result,
      cached: cache.getDashboardOverview(settings.getRelevanceSettings()),
    };
  });


  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrInlineSuggest, async (_event, query: unknown) => {
    return references.suggestBrDecisions(adapter, assertString(query, 'gremia-br:inline-suggest', 'Suchbegriff', { minLength: 1, maxLength: 120 }));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrReferencesList, async (_event, caseId: unknown) => {
    return references.listForCase(assertString(caseId, 'gremia-br:references:list', 'Fallakten-ID', { minLength: 1, maxLength: 120 }));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrReferencesCreate, async (_event, input: unknown) => {
    return references.createOrUpdate(assertRecordInput<CreateGremiaBrExternalReferenceInput>(input, 'gremia-br:references:create'));
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrReferencesDelete, async (_event, referenceId: unknown) => {
    return references.delete(assertString(referenceId, 'gremia-br:references:delete', 'Referenz-ID', { minLength: 1, maxLength: 120 }));
  });
}
