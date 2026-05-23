import { dialog, type IpcMain } from 'electron';
import { CaseHandoverService } from '../../services/caseHandoverService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CaseHandoverExportInput, CaseHandoverImportInput } from '../../src/app/core/models/case-handover.model.js';
import { assertRecordInput, assertString, sanitizeDialogFileName } from './ipcValidation.js';

export function registerCaseHandoverIpc(ipcMain: IpcMain, security: SecurityService): void {
  const handover = new CaseHandoverService(() => security.getActiveDatabase(), () => security.getDataDirectory());

  ipcMain.handle('caseHandover:export', async (_event, input: unknown, suggestedFileName?: unknown) => {
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

  ipcMain.handle('caseHandover:select-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Fallübergabepaket öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    return { canceled: false, filePath, fileName: filePath.split(/[\\/]/).pop() ?? 'Übergabepaket.gsbvtransfer' };
  });

  ipcMain.handle('caseHandover:inspect', async (_event, filePath: unknown, passphrase: unknown) => {
    const validatedFilePath = assertString(filePath, 'caseHandover:inspect', 'Übergabedatei', { minLength: 1, maxLength: 2000 });
    const validatedPassphrase = assertString(passphrase, 'caseHandover:inspect', 'Transport-Passphrase', { minLength: 1, maxLength: 500 });
    if (!validatedFilePath.toLowerCase().endsWith('.gsbvtransfer')) throw new Error('Bitte eine Gremia.SBV-Übergabedatei (*.gsbvtransfer) auswählen.');
    return handover.inspect(validatedFilePath, validatedPassphrase);
  });

  ipcMain.handle('caseHandover:select-and-inspect', async (_event, passphrase: unknown) => {
    const validatedPassphrase = assertString(passphrase, 'caseHandover:select-and-inspect', 'Transport-Passphrase', { minLength: 1, maxLength: 500 });
    const result = await dialog.showOpenDialog({
      title: 'Fallübergabepaket öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Gremia.SBV Fallübergabe', extensions: ['gsbvtransfer'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    return { canceled: false, filePath, fileName: filePath.split(/[\\/]/).pop() ?? 'Übergabepaket.gsbvtransfer', inspection: handover.inspect(filePath, validatedPassphrase) };
  });

  ipcMain.handle('caseHandover:import', async (_event, input: unknown) => {
    const validated = assertRecordInput<CaseHandoverImportInput>(input, 'caseHandover:import');
    return handover.importFromFile(validated);
  });

  ipcMain.handle('caseHandover:continue-expired', async (_event, caseId: unknown, reason: unknown) => {
    const validatedCaseId = assertString(caseId, 'caseHandover:continue-expired', 'Fall-ID', { minLength: 1, maxLength: 120 });
    const validatedReason = assertString(reason, 'caseHandover:continue-expired', 'Begründung', { minLength: 3, maxLength: 2000 });
    return handover.continueExpired({ caseId: validatedCaseId, reason: validatedReason });
  });
}
