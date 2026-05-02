import { dialog, shell, type IpcMain } from 'electron';
import path from 'node:path';
import { CaseService } from '../../services/caseService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { CaseContentSearchInput, CreateCaseNoteInput, UpdateCaseNoteInput } from '../../src/app/core/models/case-note.model.js';

export function registerCaseIpc(ipcMain: IpcMain, security: SecurityService): void {
  const cases = new CaseService(
    () => security.getActiveDatabase(),
    () => security.getDataDirectory()
  );

  ipcMain.handle('cases:list', async () => cases.listCases());
  ipcMain.handle('cases:create', async (_event, input) => cases.createCase(input));
  ipcMain.handle('cases:notes:list', async (_event, caseId: string) => cases.listNotes(caseId));
  ipcMain.handle('cases:notes:create', async (_event, input: CreateCaseNoteInput) => cases.createNote(input));
  ipcMain.handle('cases:notes:update', async (_event, id: string, input: UpdateCaseNoteInput) => cases.updateNote(id, input));
  ipcMain.handle('cases:notes:delete', async (_event, id: string) => cases.deleteNote(id));
  ipcMain.handle('cases:documents:list', async (_event, caseId: string) => cases.listDocuments(caseId));
  ipcMain.handle('cases:documents:delete', async (_event, id: string) => cases.deleteDocument(id));
  ipcMain.handle('cases:documents:open', async (_event, id: string) => {
    const tempCopy = await cases.createTemporaryDocumentCopy(id);
    const error = await shell.openPath(tempCopy.filePath);
    if (error) throw new Error(error);
    return { opened: true, filePath: tempCopy.filePath };
  });
  ipcMain.handle('cases:documents:export', async (_event, id: string, suggestedFileName?: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Dokument außerhalb des Gremia.SBV-Tresors speichern',
      defaultPath: suggestedFileName ? path.basename(suggestedFileName) : undefined,
      buttonLabel: 'Klartextkopie speichern'
    });
    if (result.canceled || !result.filePath) return { exported: false, filePath: '' };
    return cases.exportDocument(id, result.filePath);
  });
  ipcMain.handle('cases:documents:select-and-import', async (_event, caseId: string, containsHealthData = true) => {
    const result = await dialog.showOpenDialog({
      title: 'Dokument zur Fallakte hinzufügen',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Dokumente', extensions: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt', 'md', 'csv', 'json', 'xml'] },
        { name: 'Alle Dateien', extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return [];
    const imported = [];
    for (const filePath of result.filePaths) {
      imported.push(await cases.importDocument(caseId, filePath, containsHealthData));
    }
    return imported;
  });
  ipcMain.handle('cases:search', async (_event, input: CaseContentSearchInput) => cases.searchContent(input));
}
