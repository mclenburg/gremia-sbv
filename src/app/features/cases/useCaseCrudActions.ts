import { waitForBridge } from "../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "./caseWorkbenchFormat";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CaseNoteRecord } from "../../core/models/case-note.model";
import type { CaseDocumentRecord } from "../../core/models/case-document.model";
import type { CaseRecord, PersonBindingState } from "../../core/models/case.model";
import type { ProtectedPersonRecord } from "../../core/models/protected-person.model";
import type { CaseExplorerSelection } from "./caseWorkbenchTypes";
import type { CasesViewProps } from "./casesViewTypes";
import type { useCaseNoteEditor } from "./useCaseNoteEditor";
import type { useCaseWorkbenchSearch } from "./useCaseWorkbenchSearch";
import type { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import type { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import type { TemplateRecord, RenderedTemplateResult } from "../../core/models/template.model";
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { buildTerminationExportContext, terminationPrivacyExportNotice } from "@services/terminationPrivacyPolicy";
import { buildProcessTemplateValues, defaultCaseProcessDraft, downloadRenderedTemplate, isBemProcessRecord, isEqualizationProcessRecord, isTemplateConnectedToProcessStatus, isTerminationHearingRecord } from "./casesViewProcessUtils";
import { loadTemplateDefaultValues } from "../../shared/templates/templateDefaults";

type UseCaseCrudActionsDeps = {
  setError: Dispatch<SetStateAction<string>>;
  setIsCaseCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  caseNumber: string;
  displayName: string;
  category: Parameters<CasesViewProps["onCreateCase"]>[0]["category"];
  summary: string;
  selectedProtectedPersonId: string;
  protectedPersons: ProtectedPersonRecord[];
  onCreateCase: CasesViewProps["onCreateCase"];
  onCasesChanged: CasesViewProps["onCasesChanged"];
  setCaseNumber: Dispatch<SetStateAction<string>>;
  setDisplayName: Dispatch<SetStateAction<string>>;
  setSummary: Dispatch<SetStateAction<string>>;
  setSelectedProtectedPersonId: Dispatch<SetStateAction<string>>;
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
  announce: ReturnType<typeof useAnnouncer>;
};

export function useCaseCrudActions(deps: UseCaseCrudActionsDeps) {
  const { setError, setIsCaseCreateModalOpen, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, onCreateCase, onCasesChanged, setCaseNumber, setDisplayName, setSummary, setSelectedProtectedPersonId, setNoteError, editingNote, noteEditor, reloadSelectedCaseChildren, setSelection, searchQuery, runSearch, setDocumentError, selectedCaseId, selectedCase, confirmDialog, announce } = deps;
  function openCaseCreateModal() {
    setError("");
    setIsCaseCreateModalOpen(true);
  }

  function cancelCaseCreateModal() {
    setIsCaseCreateModalOpen(false);
    setError("");
  }

  async function createCaseFromModal(mode: "identified" | "anonymous") {
    setError("");
    if (!caseNumber.trim()) {
      setError("Bitte ein Aktenzeichen erfassen.");
      return;
    }
    if (mode === "identified" && !selectedProtectedPersonId) {
      setError("Bitte zuerst eine Person auswählen oder den Sonderweg ohne Personenbezug nutzen.");
      return;
    }

    try {
      let protectedPersonId = selectedProtectedPersonId;
      let bindingState: PersonBindingState = "active";
      let nextDisplayName = displayName.trim();
      if (mode === "anonymous") {
        const bridge = await waitForBridge();
        if (!bridge?.persons) throw new Error("Personendienst ist nicht erreichbar.");
        const anonymousPerson = await bridge.persons.createAnonymousRequest();
        protectedPersonId = anonymousPerson.id;
        bindingState = "anonymous_request";
        nextDisplayName = displayName.trim() || anonymousPerson.pseudonymLabel || "Anonyme Beratung";
      } else if (!nextDisplayName) {
        const person = protectedPersons.find((entry) => entry.id === selectedProtectedPersonId);
        nextDisplayName = person?.pseudonymLabel || [person?.lastName, person?.firstName].filter(Boolean).join(", ") || "Personenbezogene Fallakte";
      }
      await onCreateCase({
        caseNumber: caseNumber.trim(),
        displayName: nextDisplayName,
        category,
        summary: summary.trim() || undefined,
        protectedPersonId,
        personBindingState: bindingState,
        isPseudonymized: bindingState === "anonymous_request",
      });
      announce(bindingState === "anonymous_request" ? "Anonyme Anfrage wurde angelegt." : "Fallakte wurde mit Person verknüpft.");
      setCaseNumber("");
      setDisplayName("");
      setSummary("");
      setSelectedProtectedPersonId("");
      setIsCaseCreateModalOpen(false);
      await onCasesChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Fall konnte nicht angelegt werden.");
    }
  }

  async function addCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createCaseFromModal("identified");
  }

  async function addAnonymousCase() {
    await createCaseFromModal("anonymous");
  }

  async function deleteNote(note: CaseNoteRecord) {
    setNoteError("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.deleteNote(note.id);
      if (editingNote?.id === note.id) noteEditor.resetNoteForm();
      await reloadSelectedCaseChildren();
      setSelection({ type: "overview" });
      if (searchQuery.trim()) await runSearch();
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
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      const imported = await bridge.cases.selectAndImportDocuments(
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
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.openDocument(document.id);
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
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.exportDocument(document.id, document.filename);
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
      const bridge = await waitForBridge();
      if (!bridge?.cases) throw new Error("Falldienst ist nicht erreichbar.");
      await bridge.cases.deleteDocument(document.id);
      await reloadSelectedCaseChildren();
      setSelection({ type: "overview" });
      if (searchQuery.trim()) await runSearch();
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokument konnte nicht gelöscht werden.",
      );
    }
  }


  return { openCaseCreateModal, cancelCaseCreateModal, addCase, addAnonymousCase, deleteNote, importDocuments, openDocument, exportDocument, deleteDocument };
}
