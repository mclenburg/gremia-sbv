import type { IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertBoolean, assertRecordInput, assertString } from './ipcValidation.js';
import type { SaveTransferRecipientProfileInput } from '../../src/domain/models/transfer-recipient-profile.model.js';

export function registerTransferIdentityIpc(ipcMain: IpcMain, _security: SecurityService, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferIdentityGet, async () => services.transferIdentity().getPublicIdentity());
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferRecipientProfilesList, async () => services.transferRecipientProfiles().list());
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferRecipientProfilesSave, async (_event, input: unknown) => {
    const record = assertRecordInput<SaveTransferRecipientProfileInput>(input, 'transfer-recipient-profiles:save');
    return services.transferRecipientProfiles().save({
      label: assertString(record.label, 'transfer-recipient-profiles:save', 'Bezeichnung', { minLength: 1, maxLength: 120 }),
      recipientToken: assertString(record.recipientToken, 'transfer-recipient-profiles:save', 'Empfängerkennung', { minLength: 1, maxLength: 3000 }),
    });
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferRecipientProfilesSetActive, async (_event, id: unknown, active: unknown) => services.transferRecipientProfiles().setActive(
    assertString(id, 'transfer-recipient-profiles:set-active', 'Profil-ID', { minLength: 1, maxLength: 120 }),
    assertBoolean(active, 'transfer-recipient-profiles:set-active', 'Aktivstatus'),
  ));
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferRecipientProfilesDelete, async (_event, id: unknown) => services.transferRecipientProfiles().remove(
    assertString(id, 'transfer-recipient-profiles:delete', 'Profil-ID', { minLength: 1, maxLength: 120 }),
  ));
}
