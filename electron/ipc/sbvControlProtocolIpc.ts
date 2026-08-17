import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CreateSbvControlProtocolInput, UpdateSbvControlProtocolInput } from '../../src/domain/models/sbv-control-protocol.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerSbvControlProtocolIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const protocols = services.sbvControlProtocols;

  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvControlProtocolsList, async () => protocols().list());
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvControlProtocolsCreate, async (_event, input: unknown) =>
    protocols().create(assertRecordInput<CreateSbvControlProtocolInput>(input, 'sbvControlProtocols:create'))
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvControlProtocolsUpdate, async (_event, id: unknown, input: unknown) =>
    protocols().update(
      assertString(id, 'sbvControlProtocols:update', 'Protokoll-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateSbvControlProtocolInput>(input, 'sbvControlProtocols:update')
    )
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.sbvControlProtocolsDelete, async (_event, id: unknown) =>
    protocols().delete(assertString(id, 'sbvControlProtocols:delete', 'Protokoll-ID', { minLength: 1, maxLength: 120 }))
  );
}
