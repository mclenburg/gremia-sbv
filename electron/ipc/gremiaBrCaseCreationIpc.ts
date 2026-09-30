import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CreateGremiaBrRemoteCaseInput } from '../../src/domain/models/gremia-br.model.js';
import { GremiaBrCaseCreationService } from '../../services/gremiaBr/gremiaBrCaseCreationService.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerGremiaBrCaseCreationIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const creation = new GremiaBrCaseCreationService(
    () => security.getActiveDatabase(), services.gremiaBrAuth, services.gremiaBrReferences,
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrProcedureTypesList, async () => creation.listProcedureTypes());
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCaseCreationPendingGet, async (_event, rawCaseId: unknown) =>
    creation.pendingForCase(assertString(rawCaseId, 'gremia-br:case-creation:pending:get', 'Fallakten-ID', { minLength: 1, maxLength: 120 })));
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCaseCreationCreate, async (_event, rawInput: unknown) =>
    creation.create(assertRecordInput<CreateGremiaBrRemoteCaseInput>(rawInput, 'gremia-br:case-creation:create')));
  registerIpcHandler(ipcMain, IPC_CHANNELS.gremiaBrCaseCreationResume, async (_event, rawId: unknown) =>
    creation.resume(assertString(rawId, 'gremia-br:case-creation:resume', 'Anlage-ID', { minLength: 1, maxLength: 120 })));
}
