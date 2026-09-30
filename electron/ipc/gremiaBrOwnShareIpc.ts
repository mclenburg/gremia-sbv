import type { IpcMain } from 'electron';
import type { DatabaseAdapter } from '../../services/databaseService.js';
import type { GremiaBrAuthService } from '../../services/gremiaBr/gremiaBrAuthService.js';
import { GremiaBrOwnShareService } from '../../services/gremiaBr/gremiaBrOwnShareService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertPlainObject, assertString } from './ipcValidation.js';

export function registerGremiaBrOwnShareIpc(ipcMain: IpcMain, auth: GremiaBrAuthService, getDatabase: () => DatabaseAdapter): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrManagedDocumentsList, async () =>
    new GremiaBrOwnShareService(getDatabase, auth).listManagedDocuments());
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrOwnSharesList, async (_event, rawId: unknown) => {
    const id = assertString(rawId, 'gremia-br:own-shares:list', 'Dokument-ID', { minLength: 1, maxLength: 120 });
    return new GremiaBrOwnShareService(getDatabase, auth).list(id);
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrOwnShareCreate, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:own-share:create';
    const input = assertPlainObject(rawInput, channel);
    return new GremiaBrOwnShareService(getDatabase, auth).create({
      documentId: assertString(input.documentId, channel, 'Dokument-ID', { minLength: 1, maxLength: 120 }),
      targetSecurityDomain: assertString(input.targetSecurityDomain, channel, 'Zielbereich', { minLength: 1, maxLength: 120 }),
      purpose: assertString(input.purpose, channel, 'Zweck', { minLength: 1, maxLength: 1024 }),
      validUntil: assertString(input.validUntil, channel, 'Ablaufdatum', { minLength: 1, maxLength: 40 }),
      ...(input.soloJustification ? { soloJustification: assertString(input.soloJustification, channel, 'Alleinfreigabe-Begründung', { minLength: 1, maxLength: 1024 }) } : {}),
    });
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrOwnShareRevoke, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:own-share:revoke';
    const input = assertPlainObject(rawInput, channel);
    return new GremiaBrOwnShareService(getDatabase, auth).revoke({
      documentId: assertString(input.documentId, channel, 'Dokument-ID', { minLength: 1, maxLength: 120 }),
      shareId: assertString(input.shareId, channel, 'Freigabe-ID', { minLength: 1, maxLength: 120 }),
      reason: assertString(input.reason, channel, 'Grund', { minLength: 1, maxLength: 1024 }),
    });
  });
}
