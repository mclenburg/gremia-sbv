import { waitForBridge } from "../../core/bridge/waitForBridge";
import { fromDateTimeLocalValue } from "./caseWorkbenchFormat";
import type { FormEvent } from "react";
import type { CaseNoteRecord } from "../../core/models/case-note.model";
import type { CaseDocumentRecord } from "../../core/models/case-document.model";
import type { TemplateRecord, RenderedTemplateResult } from "../../core/models/template.model";
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { buildTerminationExportContext, terminationPrivacyExportNotice } from "@services/terminationPrivacyPolicy";
import { buildProcessTemplateValues, defaultCaseProcessDraft, downloadRenderedTemplate, isBemProcessRecord, isEqualizationProcessRecord, isTemplateConnectedToProcessStatus, isTerminationHearingRecord, loadTemplateDefaultValues } from "./casesViewProcessUtils";

type useCaseCrudActionsDeps = Record<string, any>;

export function useCaseCrudActions(deps: useCaseCrudActionsDeps) {
  const { setError, setIsCaseCreateModalOpen, caseNumber, displayName, category, summary, onCreateCase, onCasesChanged, setCaseNumber, setDisplayName, setSummary, setNoteError, editingNote, noteEditor, reloadSelectedCaseChildren, setSelection, searchQuery, runSearch, setDocumentError, selectedCaseId, selectedCase, confirmDialog, announce } = deps;
  function openCaseCreateModal() {
    setError("");
    setIsCaseCreateModalOpen(true);
  }

  function cancelCaseCreateModal() {
    setIsCaseCreateModalOpen(false);
    setError("");
  }

  async function addCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!caseNumber.trim() || !displayName.trim()) {
      setError("Bitte Aktenzeichen und Namen/Pseudonym erfassen.");
      return;
    }

    try {
      await onCreateCase({
        caseNumber: caseNumber.trim(),
        displayName: displayName.trim(),
        category,
        summary: summary.trim() || undefined,
      });
      setCaseNumber("");
      setDisplayName("");
      setSummary("");
      setIsCaseCreateModalOpen(false);
      await onCasesChanged();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Fall konnte nicht angelegt werden.",
      );
    }
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


  return { openCaseCreateModal, cancelCaseCreateModal, addCase, deleteNote, importDocuments, openDocument, exportDocument, deleteDocument };
}
