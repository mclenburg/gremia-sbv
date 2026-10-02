import type { IpcMain } from 'electron';
import type { GremiaBrAuthService } from '../../services/gremiaBr/gremiaBrAuthService.js';
import { GremiaBrAccessApprovalService } from '../../services/gremiaBr/gremiaBrAccessApprovalService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertPlainObject, assertString, IpcValidationError } from './ipcValidation.js';

export function registerGremiaBrAccessApprovalIpc(ipcMain: IpcMain, auth: GremiaBrAuthService): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrDocumentAccessRequest, async (_event, rawInput: unknown) => {
    const channel = 'gremia-br:document:access-request:create';
    const input = assertPlainObject(rawInput, channel);
    const actionScope = assertString(input.actionScope, channel, 'Zugriffsart', { minLength: 1, maxLength: 10 });
    if (actionScope !== 'READ' && actionScope !== 'MANAGE') throw new IpcValidationError(channel, 'Zugriffsart ist ungültig.');
    if (typeof input.durationMs !== 'number') throw new IpcValidationError(channel, 'Laufzeit ist ungültig.');
    return new GremiaBrAccessApprovalService(auth).requestDocumentAccess({
      documentId: assertString(input.documentId, channel, 'Dokument-ID', { minLength: 1, maxLength: 120 }),
      actionScope,
      purpose: assertString(input.purpose, channel, 'Zweck', { minLength: 1, maxLength: 1024 }),
      durationMs: input.durationMs,
    });
  });
}
