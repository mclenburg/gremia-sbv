import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { dialog, type IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type { CaseHandoverExportInput, CaseHandoverImportInput } from '../../src/app/core/models/case-handover.model.js';
import { assertRecordInput, assertString, sanitizeDialogFileName } from './ipcValidation.js';
import { issueSelectedFileCapability, resolveSelectedFileCapability } from './selectedFileCapability.js';

export function registerCaseHandoverIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  const handover = services.caseHandover;

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
    return handover.exportToFile(validated, result.filePath);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverSelectFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Fallübergabepaket öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const capability = issueSelectedFileCapability(filePath, 'case-handover');
    return { canceled: false, filePath: capability.fileToken, fileName: capability.fileName };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverInspect, async (_event, filePath: unknown, passphrase: unknown) => {
    const fileToken = assertString(filePath, 'caseHandover:inspect', 'Dateiauswahl', { minLength: 1, maxLength: 2000 });
    const validatedFilePath = resolveSelectedFileCapability(fileToken, 'case-handover', 'caseHandover:inspect');
    const validatedPassphrase = assertString(passphrase, 'caseHandover:inspect', 'Transport-Passphrase', { minLength: 1, maxLength: 500 });
    if (!validatedFilePath.toLowerCase().endsWith('.gsbvtransfer')) throw new Error('Bitte eine Gremia.SBV-Übergabedatei (*.gsbvtransfer) auswählen.');
    return handover.inspect(validatedFilePath, validatedPassphrase);
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverSelectAndInspect, async (_event, passphrase: unknown) => {
    const validatedPassphrase = assertString(passphrase, 'caseHandover:select-and-inspect', 'Transport-Passphrase', { minLength: 1, maxLength: 500 });
    const result = await dialog.showOpenDialog({
      title: 'Fallübergabepaket öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const capability = issueSelectedFileCapability(filePath, 'case-handover');
    return { canceled: false, filePath: capability.fileToken, fileName: capability.fileName, inspection: handover.inspect(filePath, validatedPassphrase) };
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverImport, async (_event, input: unknown) => {
    const validated = assertRecordInput<CaseHandoverImportInput>(input, 'caseHandover:import');
    const resolvedFilePath = resolveSelectedFileCapability(validated.filePath, 'case-handover', 'caseHandover:import');
    return handover.importFromFile({ ...validated, filePath: resolvedFilePath });
  });

  registerIpcHandler(ipcMain, IPC_CHANNELS.caseHandoverContinueExpired, async (_event, caseId: unknown, reason: unknown) => {
    const validatedCaseId = assertString(caseId, 'caseHandover:continue-expired', 'Fall-ID', { minLength: 1, maxLength: 120 });
    const validatedReason = assertString(reason, 'caseHandover:continue-expired', 'Begründung', { minLength: 3, maxLength: 2000 });
    return handover.continueExpired({ caseId: validatedCaseId, reason: validatedReason });
  });
}
