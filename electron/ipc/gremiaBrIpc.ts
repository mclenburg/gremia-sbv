import { registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { GremiaBrHttpReadAdapter } from '../../services/gremiaBr/gremiaBrHttpReadAdapter.js';
import type { CreateGremiaBrExternalReferenceInput, GremiaBrRelevanceSettings, GremiaBrSettingsInput } from '../../src/app/core/models/gremia-br.model.js';
import { assertRecordInput } from './ipcValidation.js';

export function registerGremiaBrIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const settings = services.gremiaBrSettings;
  const auth = services.gremiaBrAuth;
  const cache = services.gremiaBrCache;
  const adapter = new GremiaBrHttpReadAdapter(auth);
  const references = services.gremiaBrReferences;

  registerIpcHandler(ipcMain, 'gremia-br:settings:get', async () => settings.getPublicSettings());

  registerIpcHandler(ipcMain, 'gremia-br:settings:save', async (_event, input: unknown) => {
    auth.clearToken();
    const saved = settings.saveSettings(assertRecordInput<GremiaBrSettingsInput>(input, 'gremia-br:settings:save'));
    if (!saved.enabled) cache.clear();
    return saved;
  });

  registerIpcHandler(ipcMain, 'gremia-br:relevance:save', async (_event, input: unknown) => {
    return settings.saveRelevanceSettings(assertRecordInput<GremiaBrRelevanceSettings>(input, 'gremia-br:relevance:save'));
  });

  registerIpcHandler(ipcMain, 'gremia-br:credentials:clear', async () => {
    auth.clearToken();
    const next = settings.clearCredentials();
    cache.clear();
    return next;
  });

  registerIpcHandler(ipcMain, 'gremia-br:connection:test', async () => auth.testConnection());

  registerIpcHandler(ipcMain, 'gremia-br:cache:get', async () => cache.getOverview());

  registerIpcHandler(ipcMain, 'gremia-br:dashboard:get', async () => cache.getDashboardOverview(settings.getRelevanceSettings()));

  registerIpcHandler(ipcMain, 'gremia-br:cache:refresh', async () => {
    const result = await cache.refresh(adapter);
    return {
      ...result,
      cached: cache.getDashboardOverview(settings.getRelevanceSettings()),
    };
  });


  registerIpcHandler(ipcMain, 'gremia-br:inline:suggest', async (_event, query: unknown) => {
    return references.suggestBrDecisions(adapter, typeof query === 'string' ? query : '');
  });

  registerIpcHandler(ipcMain, 'gremia-br:references:list', async (_event, caseId: unknown) => {
    if (typeof caseId !== 'string') throw new Error('Fallakten-ID fehlt.');
    return references.listForCase(caseId);
  });

  registerIpcHandler(ipcMain, 'gremia-br:references:create', async (_event, input: unknown) => {
    return references.createOrUpdate(assertRecordInput<CreateGremiaBrExternalReferenceInput>(input, 'gremia-br:references:create'));
  });

  registerIpcHandler(ipcMain, 'gremia-br:references:delete', async (_event, referenceId: unknown) => {
    if (typeof referenceId !== 'string') throw new Error('Referenz-ID fehlt.');
    return references.delete(referenceId);
  });
}
