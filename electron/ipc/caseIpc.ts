import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { dialog, shell, type IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CaseContentSearchInput,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../../src/domain/models/case-note.model.js";
import type { CreateCaseInput, LegacyCaseBindingInput } from "../../src/domain/models/case.model.js";
import {
  assertOptionalBoolean,
  assertOptionalString,
  assertRecordInput,
  assertString,
  sanitizeDialogFileName,
} from "./ipcValidation.js";
import { requestShellPathOpen } from "./shellOpenPath.js";

const DOCUMENT_IMPORT_EXTENSIONS = [
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "txt",
  "md",
  "csv",
  "json",
  "xml",
] as const;

export function registerCaseIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const cases = services.cases;

  registerIpcHandler(ipcMain, IPC_CHANNELS.casesList, async () => cases.listCases());
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesCreate, async (_event, input: unknown) =>
    cases.createCase(assertRecordInput<CreateCaseInput>(input, "cases:create")),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesBindLegacy, async (_event, input: unknown) =>
    cases.bindLegacyCase(assertRecordInput<LegacyCaseBindingInput>(input, "cases:bind-legacy")),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesNotesList, async (_event, caseId: unknown) =>
    cases.listNotes(assertString(caseId, "cases:notes:list", "Fall-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesNotesCreate, async (_event, input: unknown) =>
    cases.createNote(
      assertRecordInput<CreateCaseNoteInput>(input, "cases:notes:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesNotesUpdate,
    async (_event, id: unknown, input: unknown) =>
      cases.updateNote(
        assertString(id, "cases:notes:update", "Notiz-ID", { minLength: 1, maxLength: 120 }),
        assertRecordInput<UpdateCaseNoteInput>(input, "cases:notes:update"),
      ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesNotesDelete, async (_event, id: unknown) =>
    cases.deleteNote(assertString(id, "cases:notes:delete", "Notiz-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesDocumentsList, async (_event, caseId: unknown, measureId?: unknown) =>
    cases.listDocuments(
      assertString(caseId, "cases:documents:list", "Fall-ID", { minLength: 1, maxLength: 120 }),
      assertOptionalString(measureId, "cases:documents:list", "Maßnahmen-ID", { maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesDocumentsDelete, async (_event, id: unknown) =>
    cases.deleteDocument(assertString(id, "cases:documents:delete", "Dokument-ID", { minLength: 1, maxLength: 120 })),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesDocumentsOpen, async (_event, id: unknown) => {
    const documentId = assertString(id, "cases:documents:open", "Dokument-ID", { minLength: 1, maxLength: 120 });
    const tempCopy = await cases.createTemporaryDocumentCopy(documentId);
    const openResult = await requestShellPathOpen(tempCopy.filePath, (targetPath) => shell.openPath(targetPath));
    if (!openResult.opened) throw new Error(openResult.error);
    return { opened: true, filePath: tempCopy.filePath };
  });
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesDocumentsExport,
    async (_event, id: unknown, suggestedFileName?: unknown) => {
      const documentId = assertString(id, "cases:documents:export", "Dokument-ID", { minLength: 1, maxLength: 120 });
      const safeSuggestedFileName = sanitizeDialogFileName(
        suggestedFileName,
        "cases:documents:export",
        "vorgeschlagener Dateiname",
      );
      const result = await dialog.showSaveDialog({
        title: "Dokument außerhalb des Gremia.SBV-Tresors speichern",
        defaultPath: safeSuggestedFileName,
        buttonLabel: "Klartextkopie speichern",
      });
      if (result.canceled || !result.filePath) {
        return { exported: false, filePath: "" };
      }
      return cases.exportDocument(documentId, result.filePath);
    },
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesDocumentsSelectAndImport,
    async (_event, caseId: unknown, containsHealthData: unknown = true, measureId?: unknown) => {
      const validatedCaseId = assertString(
        caseId,
        "cases:documents:select-and-import",
        "Fall-ID",
        { minLength: 1, maxLength: 120 },
      );
      const validatedContainsHealthData = assertOptionalBoolean(
        containsHealthData,
        "cases:documents:select-and-import",
        "Gesundheitsdaten-Kennzeichen",
        true,
      );
      const validatedMeasureId = assertOptionalString(
        measureId,
        "cases:documents:select-and-import",
        "Maßnahmen-ID",
        { maxLength: 120 },
      );
      const result = await dialog.showOpenDialog({
        title: "Dokument zur Fallakte hinzufügen",
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "Dokumente", extensions: [...DOCUMENT_IMPORT_EXTENSIONS] },
        ],
      });
      if (result.canceled || !result.filePaths.length) return [];
      const imported = [];
      for (const filePath of result.filePaths) {
        imported.push(
          await cases.importDocument(
            validatedCaseId,
            filePath,
            validatedContainsHealthData,
            validatedMeasureId,
          ),
        );
      }
      return imported;
    },
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.casesSearch, async (_event, input: unknown) =>
    cases.searchContent(
      assertRecordInput<CaseContentSearchInput>(input, "cases:search"),
    ),
  );
}
