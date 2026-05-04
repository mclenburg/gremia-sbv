import { dialog, shell, type IpcMain } from "electron";
import { CaseService } from "../../services/caseService.js";
import type { SecurityService } from "../../services/securityService.js";
import type {
  CaseContentSearchInput,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
} from "../../src/app/core/models/case-note.model.js";
import type { CreateCaseInput } from "../../src/app/core/models/case.model.js";
import {
  assertOptionalBoolean,
  assertRecordInput,
  assertString,
  sanitizeDialogFileName,
} from "./ipcValidation.js";

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
): void {
  const cases = new CaseService(
    () => security.getActiveDatabase(),
    () => security.getDataDirectory(),
  );

  ipcMain.handle("cases:list", async () => cases.listCases());
  ipcMain.handle("cases:create", async (_event, input: unknown) =>
    cases.createCase(assertRecordInput<CreateCaseInput>(input, "cases:create")),
  );
  ipcMain.handle("cases:notes:list", async (_event, caseId: unknown) =>
    cases.listNotes(assertString(caseId, "cases:notes:list", "Fall-ID", { minLength: 1, maxLength: 120 })),
  );
  ipcMain.handle("cases:notes:create", async (_event, input: unknown) =>
    cases.createNote(
      assertRecordInput<CreateCaseNoteInput>(input, "cases:notes:create"),
    ),
  );
  ipcMain.handle(
    "cases:notes:update",
    async (_event, id: unknown, input: unknown) =>
      cases.updateNote(
        assertString(id, "cases:notes:update", "Notiz-ID", { minLength: 1, maxLength: 120 }),
        assertRecordInput<UpdateCaseNoteInput>(input, "cases:notes:update"),
      ),
  );
  ipcMain.handle("cases:notes:delete", async (_event, id: unknown) =>
    cases.deleteNote(assertString(id, "cases:notes:delete", "Notiz-ID", { minLength: 1, maxLength: 120 })),
  );
  ipcMain.handle("cases:documents:list", async (_event, caseId: unknown) =>
    cases.listDocuments(assertString(caseId, "cases:documents:list", "Fall-ID", { minLength: 1, maxLength: 120 })),
  );
  ipcMain.handle("cases:documents:delete", async (_event, id: unknown) =>
    cases.deleteDocument(assertString(id, "cases:documents:delete", "Dokument-ID", { minLength: 1, maxLength: 120 })),
  );
  ipcMain.handle("cases:documents:open", async (_event, id: unknown) => {
    const documentId = assertString(id, "cases:documents:open", "Dokument-ID", { minLength: 1, maxLength: 120 });
    const tempCopy = await cases.createTemporaryDocumentCopy(documentId);
    const error = await shell.openPath(tempCopy.filePath);
    if (error) throw new Error(error);
    return { opened: true, filePath: tempCopy.filePath };
  });
  ipcMain.handle(
    "cases:documents:export",
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
  ipcMain.handle(
    "cases:documents:select-and-import",
    async (_event, caseId: unknown, containsHealthData: unknown = true) => {
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
          ),
        );
      }
      return imported;
    },
  );
  ipcMain.handle("cases:search", async (_event, input: unknown) =>
    cases.searchContent(
      assertRecordInput<CaseContentSearchInput>(input, "cases:search"),
    ),
  );
}
