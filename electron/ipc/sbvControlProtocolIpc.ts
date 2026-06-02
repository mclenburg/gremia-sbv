import type { IpcMain } from 'electron';
import { SbvControlProtocolService } from '../../services/sbvControlProtocolService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CreateSbvControlProtocolInput, UpdateSbvControlProtocolInput } from '../../src/app/core/models/sbv-control-protocol.model.js';
import { assertRecordInput, assertString } from './ipcValidation.js';

export function registerSbvControlProtocolIpc(ipcMain: IpcMain, security: SecurityService): void {
  const protocols = () => new SbvControlProtocolService(security.getActiveDatabase());

  ipcMain.handle('sbvControlProtocols:list', async () => protocols().list());
  ipcMain.handle('sbvControlProtocols:create', async (_event, input: unknown) =>
    protocols().create(assertRecordInput<CreateSbvControlProtocolInput>(input, 'sbvControlProtocols:create'))
  );
  ipcMain.handle('sbvControlProtocols:update', async (_event, id: unknown, input: unknown) =>
    protocols().update(
      assertString(id, 'sbvControlProtocols:update', 'Protokoll-ID', { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateSbvControlProtocolInput>(input, 'sbvControlProtocols:update')
    )
  );
  ipcMain.handle('sbvControlProtocols:delete', async (_event, id: unknown) =>
    protocols().delete(assertString(id, 'sbvControlProtocols:delete', 'Protokoll-ID', { minLength: 1, maxLength: 120 }))
  );
}
