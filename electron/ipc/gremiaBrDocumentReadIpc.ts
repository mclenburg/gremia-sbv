import { shell, type IpcMain } from 'electron';
import type { GremiaBrAuthService } from '../../services/gremiaBr/gremiaBrAuthService.js';
import type { SecurityService } from '../../services/securityService.js';
import { GremiaBrDocumentReadService } from '../../services/gremiaBr/gremiaBrDocumentReadService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertPlainObject, assertString } from './ipcValidation.js';
import { requestPlainDocumentPreview } from './documentPreviewWorkflow.js';

export function registerGremiaBrDocumentReadIpc(ipcMain: IpcMain, auth: GremiaBrAuthService, security: SecurityService): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrRemoteDocumentsSearch, async (_event, rawQuery: unknown) => {
    const query = assertString(rawQuery, 'gremia-br:remote-documents:search', 'Suchbegriff', { minLength: 1, maxLength: 512 });
    return new GremiaBrDocumentReadService(auth).search(query);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrRemoteDocumentDetailGet, async (_event, rawId: unknown) => {
    const id = assertString(rawId, 'gremia-br:remote-document:detail:get', 'Dokument-ID', { minLength: 1, maxLength: 120 });
    return new GremiaBrDocumentReadService(auth).getDetail(id);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrRemoteDocumentVersionOpen, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:remote-document:version:open';
    const input = assertPlainObject(rawInput, channel);
    const documentId = assertString(input.documentId, channel, 'Dokument-ID', { minLength: 1, maxLength: 120 });
    const versionId = assertString(input.versionId, channel, 'Versions-ID', { minLength: 1, maxLength: 120 });
    const version = await new GremiaBrDocumentReadService(auth).readVersionForPreview(documentId, versionId);
    const result = await requestPlainDocumentPreview({
      operation: channel,
      readFailureMessage: 'Die Gremia.BR-Dokumentversion konnte nicht geprüft werden.',
      security,
      opener: (path) => shell.openPath(path),
      fileName: version.filename,
      read: () => version.content,
      tempPurpose: 'document-preview',
    });
    if (!result.opened) security.cleanupTemporaryFiles();
    return { opened: result.opened, ...(result.error ? { error: result.error } : {}) };
  });
}
