import type { IpcMain } from 'electron';
import type { GremiaBrAuthService } from '../../services/gremiaBr/gremiaBrAuthService.js';
import { GremiaBrDocumentReadService } from '../../services/gremiaBr/gremiaBrDocumentReadService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertString } from './ipcValidation.js';

export function registerGremiaBrDocumentReadIpc(ipcMain: IpcMain, auth: GremiaBrAuthService): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrRemoteDocumentsSearch, async (_event, rawQuery: unknown) => {
    const query = assertString(rawQuery, 'gremia-br:remote-documents:search', 'Suchbegriff', { minLength: 1, maxLength: 512 });
    return new GremiaBrDocumentReadService(auth).search(query);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrRemoteDocumentDetailGet, async (_event, rawId: unknown) => {
    const id = assertString(rawId, 'gremia-br:remote-document:detail:get', 'Dokument-ID', { minLength: 1, maxLength: 120 });
    return new GremiaBrDocumentReadService(auth).getDetail(id);
  });
}
