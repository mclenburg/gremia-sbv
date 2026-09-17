import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { dialog, type IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CaseHandoverChecklistInput, CaseHandoverExportInput, CaseHandoverImportInput, CaseHandoverReturnDeltaExportInput } from '../../src/domain/models/case-handover.model.js';
import type { MobileCompanionDeviceStatus, MobileCompanionSnapshotInput, SaveMobileCompanionDeviceInput } from '../../src/domain/models/mobile-companion.model.js';
import { assertAllowedEnum, assertRecordInput, assertString, sanitizeDialogFileName } from './ipcValidation.js';
import { issueSelectedFileCapability, resolveSelectedFileCapability, SELECTED_FILE_PURPOSE } from './selectedFileCapability.js';

function validateMobileDeviceInput(input: unknown): SaveMobileCompanionDeviceInput {
  const value = assertRecordInput<Record<string, unknown>>(input, 'caseHandover:mobile:devices:save');
  return {
    label: assertString(value.label, 'caseHandover:mobile:devices:save', 'Gerätename', { minLength: 1, maxLength: 120 }),
    pairingResponse: assertString(value.pairingResponse, 'caseHandover:mobile:devices:save', 'Pairingantwort', { minLength: 1, maxLength: 7000 }),
    securityCode: assertString(value.securityCode, 'caseHandover:mobile:devices:save', 'Sicherheitscode', { minLength: 1, maxLength: 32 }),
  };
}

function validateMobileSnapshotInput(input: unknown): MobileCompanionSnapshotInput {
  const value = assertRecordInput<Record<string, unknown>>(input, 'caseHandover:mobile:snapshot:create');
  const caseIds = Array.isArray(value.caseIds) ? value.caseIds.map((caseId) =>
    assertString(caseId, 'caseHandover:mobile:snapshot:create', 'Fall-ID', { minLength: 1, maxLength: 120 })) : [];
  return {
    deviceId: assertString(value.deviceId, 'caseHandover:mobile:snapshot:create', 'Mobilgerät', { minLength: 1, maxLength: 120 }),
    caseIds,
    uiThemeMode: value.uiThemeMode === 'light' ? 'light' : 'dark',
  };
}

export function registerCaseHandoverIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverCockpit, async () => services.caseHandover().listCockpit());

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverChecklist, async (_event, input: unknown) =>
    services.caseHandover().checklist(assertRecordInput<CaseHandoverChecklistInput>(input, 'caseHandover:checklist')));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverExport, async (_event, input: unknown, suggestedFileName?: unknown) => {
    const validated = assertRecordInput<CaseHandoverExportInput>(input, 'caseHandover:export');
    const safeName = sanitizeDialogFileName(suggestedFileName, 'caseHandover:export', 'vorgeschlagener Dateiname') ?? 'falluebergabe.gsbvtransfer';
    const result = await dialog.showSaveDialog({
      title: 'Verschlüsseltes Fallübergabepaket speichern',
      defaultPath: safeName.endsWith('.gsbvtransfer') ? safeName : `${safeName}.gsbvtransfer`,
      buttonLabel: 'Übergabepaket speichern',
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePath) return { exported: false, filePath: '', packageId: '', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 };
    return services.caseHandover().exportToFile(validated, result.filePath);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverReturnDeltaExport, async (_event, input: unknown, suggestedFileName?: unknown) => {
    const validated = assertRecordInput<CaseHandoverReturnDeltaExportInput>(input, 'caseHandover:return-delta-export');
    const safeName = sanitizeDialogFileName(suggestedFileName, 'caseHandover:return-delta-export', 'vorgeschlagener Dateiname') ?? 'rueckgabe-delta.gsbvtransfer';
    const result = await dialog.showSaveDialog({
      title: 'Verschlüsseltes Rückgabepaket speichern',
      defaultPath: safeName.endsWith('.gsbvtransfer') ? safeName : `${safeName}.gsbvtransfer`,
      buttonLabel: 'Rückgabepaket speichern',
      filters: [{ name: 'Gremia.SBV Rückgabe-Delta', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePath) return { exported: false, filePath: '', packageId: '', packageType: 'return_delta', caseCount: 0, measureCount: 0, documentCount: 0, deadlineCount: 0 };
    return services.caseHandover().exportReturnDeltaToFile(validated, result.filePath);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverSelectFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Fallübergabepaket öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const capability = issueSelectedFileCapability(filePath, SELECTED_FILE_PURPOSE.caseHandover);
    return { canceled: false, filePath: capability.fileToken, fileName: capability.fileName };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverInspect, async (_event, filePath: unknown, passphrase: unknown) => {
    const fileToken = assertString(filePath, 'caseHandover:inspect', 'Dateiauswahl', { minLength: 1, maxLength: 2000 });
    const validatedFilePath = resolveSelectedFileCapability(fileToken, SELECTED_FILE_PURPOSE.caseHandover, 'caseHandover:inspect');
    const validatedPassphrase = assertString(passphrase, 'caseHandover:inspect', 'Transport-Passphrase', { minLength: 0, maxLength: 500 });
    if (!validatedFilePath.toLowerCase().endsWith('.gsbvtransfer')) throw new Error('Bitte eine Gremia.SBV-Übergabedatei (*.gsbvtransfer) auswählen.');
    return services.caseHandover().inspect(validatedFilePath, validatedPassphrase);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverSelectAndInspect, async (_event, passphrase: unknown) => {
    const validatedPassphrase = assertString(passphrase, 'caseHandover:select-and-inspect', 'Transport-Passphrase', { minLength: 0, maxLength: 500 });
    const result = await dialog.showOpenDialog({
      title: 'Fallübergabepaket öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const capability = issueSelectedFileCapability(filePath, SELECTED_FILE_PURPOSE.caseHandover);
    return { canceled: false, filePath: capability.fileToken, fileName: capability.fileName, inspection: services.caseHandover().inspect(filePath, validatedPassphrase) };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverImport, async (_event, input: unknown) => {
    const validated = assertRecordInput<CaseHandoverImportInput>(input, 'caseHandover:import');
    const resolvedFilePath = resolveSelectedFileCapability(validated.filePath, SELECTED_FILE_PURPOSE.caseHandover, 'caseHandover:import');
    return services.caseHandover().importFromFile({ ...validated, filePath: resolvedFilePath });
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverContinueExpired, async (_event, caseId: unknown, reason: unknown) => {
    const validatedCaseId = assertString(caseId, 'caseHandover:continue-expired', 'Fall-ID', { minLength: 1, maxLength: 120 });
    const validatedReason = assertString(reason, 'caseHandover:continue-expired', 'Begründung', { minLength: 3, maxLength: 2000 });
    return services.caseHandover().continueExpired({ caseId: validatedCaseId, reason: validatedReason });
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobileDevicesList, async () =>
    services.mobileCompanion().listDevices());

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobilePairingRequest, async () =>
    services.mobileCompanion().createPairingRequest());

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobileDevicesSave, async (_event, input: unknown) =>
    services.mobileCompanion().saveDevice(validateMobileDeviceInput(input)));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobileDeviceStatus, async (_event, id: unknown, status: unknown) =>
    services.mobileCompanion().setDeviceStatus(
      assertString(id, 'caseHandover:mobile:device-status', 'Mobilgerät', { minLength: 1, maxLength: 120 }),
      assertAllowedEnum<MobileCompanionDeviceStatus>(status, 'caseHandover:mobile:device-status', 'Status', ['active', 'disabled']),
    ));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobileSnapshotCreate, async (_event, input: unknown) =>
    services.mobileCompanion().createSnapshot(validateMobileSnapshotInput(input)));

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobileReturnSelectInspect, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Mobile Rückgabedatei öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Mobile-Rückgabe', extensions: ['gsbvmobile'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const capability = issueSelectedFileCapability(filePath, SELECTED_FILE_PURPOSE.mobileCompanionReturn);
    return {
      canceled: false,
      filePath: capability.fileToken,
      fileName: capability.fileName,
      inspection: services.mobileCompanionReturn().inspectFile(filePath),
    };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverMobileReturnImport, async (_event, filePath: unknown) => {
    const fileToken = assertString(filePath, 'caseHandover:mobile:return:import', 'Dateiauswahl', { minLength: 1, maxLength: 2000 });
    const resolvedFilePath = resolveSelectedFileCapability(fileToken, SELECTED_FILE_PURPOSE.mobileCompanionReturn, 'caseHandover:mobile:return:import');
    return services.mobileCompanionReturn().importFile(resolvedFilePath);
  });
}
