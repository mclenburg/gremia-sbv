import { app, dialog, type IpcMain } from 'electron';
import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertBoolean, assertRecordInput, assertString } from './ipcValidation.js';
import type { SaveTransferRecipientProfileInput } from '../../src/domain/models/transfer-recipient-profile.model.js';
import type { TransferCapabilityDocument } from '../../src/domain/models/transfer-capability.model.js';
import { parseTransferRecipientToken } from '../../services/transferInstanceIdentityPolicy.js';
import { verifyTransferCapabilityDocument } from '../../services/transferCapabilityDocument.js';
import { atomicWriteFileSync } from '../../services/secureFileOperations.js';
import { issueSelectedFileCapability, resolveSelectedFileCapability, SELECTED_FILE_PURPOSE } from './selectedFileCapability.js';

function readCapabilityFile(filePath: string): TransferCapabilityDocument {
  if (!filePath.toLowerCase().endsWith('.gsbvcap')) throw new Error('Bitte eine Gremia.SBV-Fähigkeitsdatei (*.gsbvcap) auswählen.');
  const descriptor = openSync(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = fstatSync(descriptor);
    if (!info.isFile() || info.size > 16 * 1024 || info.size < 10) throw new Error('Die Fähigkeitsdatei ist zu groß oder ungültig.');
    const content = readFileSync(descriptor, 'utf8');
    return JSON.parse(content) as TransferCapabilityDocument;
  } catch {
    throw new Error('Die Fähigkeitsdatei konnte nicht gelesen oder geprüft werden.');
  } finally { closeSync(descriptor); }
}

function requireProfile(services: ApplicationServices, id: string) {
  const profile = services.transferRecipientProfiles().list().find((candidate) => candidate.id === id);
  if (!profile) throw new Error('Das Empfängerprofil wurde nicht gefunden.');
  return profile;
}

export function registerTransferIdentityIpc(ipcMain: IpcMain, _security: SecurityService, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferIdentityGet, async () => services.transferIdentity().getPublicIdentity());
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferCapabilityExport, async (_event, profileId: unknown) => {
    const id = assertString(profileId, 'transfer-capability:export', 'Profil-ID', { minLength: 1, maxLength: 120 });
    const profile = requireProfile(services, id);
    if (!profile.active) throw new Error('Das Empfängerprofil ist deaktiviert.');
    const result = await dialog.showSaveDialog({
      title: 'Übergabefähigkeiten speichern', defaultPath: `uebergabefaehigkeiten-${profile.instanceId}.gsbvcap`,
      buttonLabel: 'Fähigkeitsdatei speichern', filters: [{ name: 'Gremia.SBV Fähigkeiten', extensions: ['gsbvcap'] }],
    });
    if (result.canceled || !result.filePath) return { exported: false };
    const document = services.transferRecipientProfiles().createCapability(id, services.transferIdentity().getPrivateIdentity(), app.getVersion());
    atomicWriteFileSync(result.filePath, JSON.stringify(document));
    return { exported: true, filePath: result.filePath };
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferCapabilitySelectInspect, async (_event, profileId: unknown) => {
    const id = assertString(profileId, 'transfer-capability:select-inspect', 'Profil-ID', { minLength: 1, maxLength: 120 });
    const profile = requireProfile(services, id);
    const result = await dialog.showOpenDialog({
      title: 'Übergabefähigkeiten öffnen', properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fähigkeiten', extensions: ['gsbvcap'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const document = readCapabilityFile(filePath);
    verifyTransferCapabilityDocument(document, services.transferIdentity().getPrivateIdentity(), parseTransferRecipientToken(profile.recipientToken));
    const selected = issueSelectedFileCapability(filePath, SELECTED_FILE_PURPOSE.transferCapability);
    return { canceled: false, fileToken: selected.fileToken, fileName: selected.fileName, document };
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.transferCapabilityImport, async (_event, profileId: unknown, fileToken: unknown) => {
    const id = assertString(profileId, 'transfer-capability:import', 'Profil-ID', { minLength: 1, maxLength: 120 });
    const token = assertString(fileToken, 'transfer-capability:import', 'Dateiauswahl', { minLength: 1, maxLength: 2000 });
    const path = resolveSelectedFileCapability(token, SELECTED_FILE_PURPOSE.transferCapability, 'transfer-capability:import');
    return services.transferRecipientProfiles().acceptCapability(id, readCapabilityFile(path), services.transferIdentity().getPrivateIdentity());
  });
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
