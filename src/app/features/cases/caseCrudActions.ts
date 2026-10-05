import { waitForBridge } from "../../core/bridge/waitForBridge";
import type { Dispatch, SetStateAction } from "react";
import type { CaseNoteRecord } from "../../../domain/models/case-note.model";
import type { CaseDocumentRecord } from "../../../domain/models/case-document.model";
import type { CaseRecord } from "../../../domain/models/case.model";
import type { CaseExplorerSelection } from "./caseWorkbenchTypes";
import type { useCaseNoteEditor } from "./useCaseNoteEditor";
import type { useCaseWorkbenchSearch } from "./useCaseWorkbenchSearch";
import type { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import { createCaseCreationActions, type CaseCreationActionDeps } from "./caseCreationActions";
import { buildExportWarningMessage, scanSensitiveExportText } from "@/domain/privacy/exportGuardPolicy";

type CaseCrudActionDeps = CaseCreationActionDeps & {
  setNoteError: Dispatch<SetStateAction<string>>;
  editingNote: ReturnType<typeof useCaseNoteEditor>["editingNote"];
  noteEditor: Pick<ReturnType<typeof useCaseNoteEditor>, "resetNoteForm">;
  reloadSelectedCaseChildren: () => Promise<void>;
  setSelection: (selection: CaseExplorerSelection) => void;
  searchQuery: string;
  runSearch: ReturnType<typeof useCaseWorkbenchSearch>["runSearch"];
  setDocumentError: Dispatch<SetStateAction<string>>;
  selectedCaseId: string;
  selectedCase?: CaseRecord;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
};

async function getCaseService() {
  const bridge = await waitForBridge();
  if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
  return bridge.cases;
}

export function createCaseCrudActions(deps: CaseCrudActionDeps) {
  const { setNoteError, editingNote, noteEditor, reloadSelectedCaseChildren, setSelection, searchQuery, runSearch, setDocumentError, selectedCaseId, selectedCase, confirmDialog, announce } = deps;
  const creation = createCaseCreationActions(deps);
  async function refreshAfterDeletion() {
    await reloadSelectedCaseChildren();
    setSelection({ type: "overview" });
    if (searchQuery.trim()) await runSearch();
  }

  async function deleteNote(note: CaseNoteRecord) {
    setNoteError("");
    try {
      const cases = await getCaseService();
      await cases.deleteNote(note.id);
      if (editingNote?.id === note.id) noteEditor.resetNoteForm();
      await refreshAfterDeletion();
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Gesprächsnotiz konnte nicht gelöscht werden.",
      );
    }
  }

  async function importDocuments() {
    setDocumentError("");
    if (!selectedCaseId) {
      setDocumentError("Bitte zuerst eine Fallakte auswählen.");
      return;
    }
    try {
      const cases = await getCaseService();
      const imported = await cases.selectAndImportDocuments(
        selectedCaseId,
        true,
      );
      await reloadSelectedCaseChildren();
      if (imported.length)
        setSelection({ type: "document", id: imported[0].id });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht importiert werden.",
      );
    }
  }

  async function openDocument(document: CaseDocumentRecord) {
    setDocumentError("");
    try {
      const cases = await getCaseService();
      const result = await cases.openDocument(document.id);
      if (!result.opened) {
        const message = result.error ?? "Das Falldokument wurde temporär bereitgestellt, konnte aber nicht an die externe Vorschau-Anwendung übergeben werden.";
        setDocumentError(message);
        announce(message, "assertive");
      }
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht geöffnet werden.",
      );
    }
  }

  async function exportDocument(document: CaseDocumentRecord) {
    setDocumentError("");
    const scan = scanSensitiveExportText(
      `${document.filename} ${selectedCase?.caseNumber ?? ""} ${selectedCase?.displayName ?? ""}`,
      {
        context: "Dokumentenexport",
        target: document.filename,
      },
    );
    const confirmed = await confirmDialog({
      variant: "warning",
      title: "Dokument exportieren?",
      message: buildExportWarningMessage(scan),
      confirmLabel: "Exportieren",
      cancelLabel: "Abbrechen",
    });
    if (!confirmed) return;
    try {
      const cases = await getCaseService();
      await cases.exportDocument(document.id, document.filename);
      announce("Dokument wurde exportiert.", "polite");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht exportiert werden.";
      setDocumentError(message);
      announce(message, "assertive");
    }
  }

  async function deleteDocument(document: CaseDocumentRecord) {
    setDocumentError("");
    try {
      const cases = await getCaseService();
      await cases.deleteDocument(document.id);
      await refreshAfterDeletion();
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht gelöscht werden.",
      );
    }
  }

  return { ...creation, deleteNote, importDocuments, openDocument, exportDocument, deleteDocument };
}
