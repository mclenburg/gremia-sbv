import { useEffect, useState } from "react";
import { createCaseDocumentActions } from "./useCaseDocuments";
import { useInlineCommands } from "./inlineCommands/useInlineCommands";
import { useCaseWorkbenchData } from "./useCaseWorkbenchData";
import { useCaseRegisterFilter } from "./useCaseRegisterFilter";
import { useCaseWorkbenchSearch } from "./useCaseWorkbenchSearch";
import { useCaseNoteEditor } from "./useCaseNoteEditor";
import { useCaseProcessUpdates } from "./useCaseProcessUpdates";
import { useProcessTemplateActions } from "./useProcessTemplateActions";
import { useCaseProcessCreation } from "./useCaseProcessCreation";
import { useCaseCrudActions } from "./useCaseCrudActions";
import { useLegacyCaseBindingHandlers } from "./useLegacyCaseBindingHandlers";
import { CasesViewRender } from "./CasesViewRender";
import { CaseHandoverTransferDialogs } from "./CaseHandoverTransferDialogs";
import type { CasesViewProps, CaseToast } from "./casesViewTypes";
import type { CaseCategory, CaseRecord } from "../../core/models/case.model";
import type { ProcessTemplateModalState } from "./ProcessTemplateDocumentsModal";
import type { CaseProcessDraft } from "./casesViewProcessUtils";
import { caseRegisterSliceBounds, clampCaseRegisterPage } from "./casesViewUtils";
import { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";

export function CasesView({
  cases,
  contacts,
  protectedPersons,
  target,
  onCreateCase,
  onCreateDeadline,
  onCreateContact,
  onCasesChanged,
  onTargetConsumed,
}: CasesViewProps) {
  const [caseNumber, setCaseNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<CaseCategory>("bem");
  const [summary, setSummary] = useState("");
  const [selectedProtectedPersonId, setSelectedProtectedPersonId] = useState("");
  const [isCaseCreateModalOpen, setIsCaseCreateModalOpen] = useState(false);
  const [legacyBindingCase, setLegacyBindingCase] = useState<CaseRecord | null>(null);
  const [legacyBindingError, setLegacyBindingError] = useState("");
  const [caseProcessDraft, setCaseProcessDraft] =
    useState<CaseProcessDraft | null>(null);
  const [processTemplateModal, setProcessTemplateModal] =
    useState<ProcessTemplateModalState | null>(null);
  const [error, setError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [caseToast, setCaseToast] = useState<CaseToast | null>(null);
  const [handoverExportOpen, setHandoverExportOpen] = useState(false);
  const [handoverImportOpen, setHandoverImportOpen] = useState(false);
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  const [caseLoadError, setCaseLoadError] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [caseRegisterPage, setCaseRegisterPage] = useState(1);
  const {
    selectedCaseId,
    setSelectedCaseId,
    selectedCase,
    notes,
    documents,
    caseLegalReferences,
    setCaseLegalReferences,
    casePreventionProcesses,
    caseBemProcesses,
    caseEqualizationProcesses,
    caseTerminationProcesses,
    caseParticipationProcesses,
    caseWorkplaceAccommodationProcesses,
    selection,
    setSelection,
    reloadSelectedCaseChildren,
  } = useCaseWorkbenchData({
    cases,
    target,
    onTargetConsumed,
    onError: setCaseLoadError,
  });
  const filteredCases = useCaseRegisterFilter(cases, caseFilter);
  const caseRegisterPageSize = 5;
  const caseRegisterPageCount = Math.max(
    1,
    Math.ceil(filteredCases.length / caseRegisterPageSize),
  );
  const normalizedCaseRegisterPage = clampCaseRegisterPage(
    caseRegisterPage,
    caseRegisterPageCount,
  );
  const caseRegisterSlice = caseRegisterSliceBounds(
    normalizedCaseRegisterPage,
    caseRegisterPageSize,
  );
  const visibleCases = filteredCases.slice(
    caseRegisterSlice.start,
    caseRegisterSlice.end,
  );
  const {
    searchQuery,
    setSearchQuery,
    searchOnlySelectedCase,
    setSearchOnlySelectedCase,
    searchResults,
    selectedSearchSourceTypes,
    setSelectedSearchSourceTypes,
    searchError,
    setSearchError,
    searchInfo,
    isSearching,
    runSearch,
  } = useCaseWorkbenchSearch({
    selectedCaseId,
    onSelect: setSelection,
  });

  const selectedNote =
    selection.type === "note"
      ? notes.find((note) => note.id === selection.id)
      : undefined;
  const selectedDocument =
    selection.type === "document"
      ? documents.find((doc) => doc.id === selection.id)
      : undefined;
  const selectedSearchResult =
    selection.type === "search"
      ? searchResults.find((result) => `${result.sourceType}:${result.sourceId}` === selection.id)
      : undefined;
  const selectedPreventionProcess =
    selection.type === "process" &&
    selection.processType === "prevention" &&
    selection.id
      ? casePreventionProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedBemProcess =
    selection.type === "process" &&
    selection.processType === "bem" &&
    selection.id
      ? caseBemProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedEqualizationProcess =
    selection.type === "process" &&
    selection.processType === "equalization" &&
    selection.id
      ? caseEqualizationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedTerminationProcess =
    selection.type === "process" &&
    selection.processType === "termination_hearing" &&
    selection.id
      ? caseTerminationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedParticipationProcess =
    selection.type === "process" &&
    selection.processType === "participation" &&
    selection.id
      ? caseParticipationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedWorkplaceAccommodationProcess =
    selection.type === "process" &&
    selection.processType === "workplace_accommodation" &&
    selection.id
      ? caseWorkplaceAccommodationProcesses.find((item) => item.id === selection.id)
      : undefined;
  const selectedEqualizationNotes = selectedEqualizationProcess
    ? notes.filter((note) =>
        (note.content ?? "").includes(
          `[[equalization:${selectedEqualizationProcess.id}]]`,
        ),
      )
    : [];

  const noteEditor = useCaseNoteEditor({
    selectedCaseId,
    searchQuery,
    reloadSelectedCaseChildren,
    runSearch,
    setSelection,
  });
  const {
    bindClearInlineDrafts,
    isNoteModalOpen,
    editingNote,
    noteTitle,
    setNoteTitle,
    noteDate,
    setNoteDate,
    noteType,
    setNoteType,
    participants,
    setParticipants,
    content,
    setContent,
    nextSteps,
    setNextSteps,
    containsHealthData,
    setContainsHealthData,
    confidentialLevel,
    setConfidentialLevel,
    linkedCaseIds,
    setLinkedCaseIds,
    noteError,
    setNoteError,
    noteInfo,
    setNoteInfo,
    startEditNote,
    toggleLinkedCase,
    addEntityLink,
    openNewNoteModal,
    cancelNoteModal,
    saveNote,
    ensureSelectedCaseLink,
  } = noteEditor;

  useEffect(() => {
    if (caseLoadError) setNoteError(caseLoadError);
  }, [caseLoadError, setNoteError]);

  const inlineCommands = useInlineCommands({
    selectedCaseId,
    selectedCase,
    noteTitle,
    content,
    setContent,
    nextSteps,
    setNextSteps,
    confidentialLevel,
    setConfidentialLevel,
    setLinkedCaseIds,
    setCaseLegalReferences,
    setNoteInfo,
    setNoteError,
    onCreateDeadline,
    onCreateContact,
    onEntityLinkCreated: addEntityLink,
    onStructuredActionCreated: async () => {
      await reloadSelectedCaseChildren();
      await onCasesChanged();
    },
  });

  bindClearInlineDrafts(inlineCommands.clearInlineDrafts);

  useEffect(() => {
    if (noteInfo) announce(noteInfo, "polite");
  }, [noteInfo, announce]);

  useEffect(() => {
    const message = noteError || documentError || error || caseLoadError;
    if (message) announce(message, "assertive");
  }, [noteError, documentError, error, caseLoadError, announce]);

  useEffect(() => {
    if (caseToast?.text)
      announce(
        caseToast.text,
        caseToast.variant === "warning" ? "assertive" : "polite",
      );
  }, [caseToast, announce]);

  function pushCaseToast(text: string, variant: "ok" | "warning" = "ok") {
    const id = Date.now();
    setCaseToast({ id, text, variant });
    window.setTimeout(() => {
      setCaseToast((current: CaseToast | null) =>
        current?.id === id ? null : current,
      );
    }, 4200);
  }

  useEffect(() => {
    ensureSelectedCaseLink();
  }, [selectedCaseId, editingNote]);

  useEffect(() => {
    function openCaseModalFromShortcut() {
      openCaseCreateModal();
    }

    function focusCaseSearchFromShortcut() {
      const target = document.querySelector<HTMLInputElement>(
        '[data-global-search-target=\"cases\"]',
      );
      target?.focus();
      target?.select();
    }

    window.addEventListener(
      "gremia-sbv:create-case",
      openCaseModalFromShortcut,
    );
    window.addEventListener(
      "gremia-sbv:focus-search",
      focusCaseSearchFromShortcut,
    );
    return () => {
      window.removeEventListener(
        "gremia-sbv:create-case",
        openCaseModalFromShortcut,
      );
      window.removeEventListener(
        "gremia-sbv:focus-search",
        focusCaseSearchFromShortcut,
      );
    };
  }, []);

  useEffect(() => {
    if (!noteInfo) return;
    pushCaseToast(noteInfo, "ok");
    setNoteInfo("");
  }, [noteInfo]);

  useEffect(() => {
    if (!noteError) return;
    pushCaseToast(noteError, "warning");
    setNoteError("");
  }, [noteError]);

  useEffect(() => {
    if (!documentError) return;
    pushCaseToast(documentError, "warning");
    setDocumentError("");
  }, [documentError]);

  useEffect(() => {
    if (!searchError) return;
    pushCaseToast(searchError, "warning");
    setSearchError("");
  }, [searchError]);

  const { updateCasePreventionProcess, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseParticipationProcess, updateCaseWorkplaceAccommodationProcess, createEqualizationSecureNote, updateCaseEqualizationProcess } = useCaseProcessUpdates({ setNoteError, setNoteInfo, reloadSelectedCaseChildren, selectedCase });
  const { openProcessTemplateModal, renderAndDownloadProcessTemplate } = useProcessTemplateActions({ processTemplateModal, setProcessTemplateModal, selectedCase, confirmDialog });
  const { openCaseProcessDraft, createCaseProcessFromDraft } = useCaseProcessCreation({ selectedCase, selectedCaseId, caseProcessDraft, setCaseProcessDraft, setSelection, setNoteError, setNoteInfo, reloadSelectedCaseChildren, onCasesChanged });
  const { openCaseCreateModal, cancelCaseCreateModal, addCase, addAnonymousCase, deleteNote, importDocuments, openDocument, exportDocument, deleteDocument } = useCaseCrudActions({ setError, setIsCaseCreateModalOpen, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, onCreateCase, onCasesChanged, setCaseNumber, setDisplayName, setSummary, setSelectedProtectedPersonId, setNoteError, editingNote, noteEditor, reloadSelectedCaseChildren, setSelection, searchQuery, runSearch, setDocumentError, selectedCaseId, selectedCase, confirmDialog, announce });
  const legacyBindingHandlers = useLegacyCaseBindingHandlers({ onCasesChanged, announce });
  const closedLegacyBulkCount = cases.filter((record) => record.status === 'abgeschlossen' && record.personBindingState === 'legacy_unlinked' && !record.anonymizationRecommended).length;

  async function bulkMarkClosedLegacyCases() {
    try {
      const result = await legacyBindingHandlers.bulkMarkClosedLegacyCases();
      pushCaseToast(result.message ?? `${result.marked} abgeschlossene Altakten wurden vorgemerkt.`, 'ok');
    } catch (error) {
      pushCaseToast(error instanceof Error ? error.message : 'Altakten konnten nicht vorgemerkt werden.', 'warning');
    }
  }


  async function exportSelectedCaseHandover(passphrase: string, expiresAt?: string) {
    if (!selectedCase) throw new Error('Bitte zuerst eine Fallakte auswählen.');
    const result = await window.gremiaSbv.caseHandover.export(
      { caseIds: [selectedCase.id], expiresAt, purpose: 'Urlaubsübergabe / SBV-Vertretung', passphrase },
      `${selectedCase.caseNumber}-falluebergabe.gsbvtransfer`,
    );
    if (result.exported) {
      pushCaseToast(`Übergabepaket erstellt: ${result.caseCount} Fallakte(n), ${result.measureCount} Maßnahme(n), ${result.documentCount} Dokument(e).`, 'ok');
      return;
    }
    pushCaseToast('Export wurde abgebrochen.', 'warning');
  }

  async function selectCaseHandoverFile() {
    return window.gremiaSbv.caseHandover.selectFile();
  }

  async function inspectCaseHandover(filePath: string, passphrase: string) {
    return window.gremiaSbv.caseHandover.inspect(filePath, passphrase);
  }

  async function importCaseHandover(input: { filePath: string; passphrase: string; mode: 'create_new' | 'merge_existing'; targetCaseId?: string }) {
    const result = await window.gremiaSbv.caseHandover.import(input);
    pushCaseToast(result.mode === 'merge_existing' ? 'Übergabepaket wurde mit der gewählten Akte zusammengeführt.' : 'Übergabepaket wurde als neue lokale Übergabeakte importiert.', 'ok');
    await onCasesChanged();
    const nextCaseId = result.updatedCaseIds[0] ?? result.createdCaseIds[0];
    if (nextCaseId) setSelectedCaseId(nextCaseId);
  }

  async function continueExpiredHandover() {
    if (!selectedCase) return;
    const reason = window.prompt('Begründung für die weitere Bearbeitung abgelaufener Übergabedaten:');
    if (!reason) return;
    try {
      await window.gremiaSbv.caseHandover.continueExpired(selectedCase.id, reason);
      pushCaseToast('Weitere Bearbeitung der abgelaufenen Übergabedaten wurde bestätigt.', 'ok');
      await onCasesChanged();
    } catch (error) {
      pushCaseToast(error instanceof Error ? error.message : 'Bestätigung konnte nicht dokumentiert werden.', 'warning');
    }
  }

    function openLegacyBindingDialog(caseRecord: CaseRecord) {
    setLegacyBindingError("");
    setLegacyBindingCase(caseRecord);
  }

  async function assignLegacyCase(protectedPersonId: string, reason: string) {
    if (!legacyBindingCase) return;
    setLegacyBindingError("");
    try {
      await legacyBindingHandlers.bindLegacyCase(legacyBindingCase, protectedPersonId, reason);
      setLegacyBindingCase(null);
      setSelectedCaseId(legacyBindingCase.id);
    } catch (error) {
      setLegacyBindingError(error instanceof Error ? error.message : "Legacy-Zuordnung konnte nicht gespeichert werden.");
    }
  }
  const documentActions = createCaseDocumentActions({
    importDocuments,
    openDocument,
    exportDocument,
    deleteDocument,
  });

  return <>
    <CaseHandoverTransferDialogs
      exportOpen={handoverExportOpen}
      importOpen={handoverImportOpen}
      selectedCase={selectedCase}
      onCloseExport={() => setHandoverExportOpen(false)}
      onCloseImport={() => setHandoverImportOpen(false)}
      onExport={exportSelectedCaseHandover}
      onSelectImportFile={selectCaseHandoverFile}
      onInspectImport={inspectCaseHandover}
      onImport={importCaseHandover}
    />
    <CasesViewRender {...{ caseToast, visibleCases, selectedCaseId, filteredCases, caseFilter, setCaseFilter, normalizedCaseRegisterPage, caseRegisterPageCount, caseRegisterPageSize, setCaseRegisterPage, openCaseCreateModal, selectedCase, selectedNote, selectedDocument, selectedSearchResult, selectedPreventionProcess, selectedBemProcess, selectedTerminationProcess, selectedEqualizationProcess, selectedEqualizationNotes, selectedParticipationProcess, selectedWorkplaceAccommodationProcess, notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses, caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses, selection, setSelection, setSelectedCaseId, searchQuery, searchOnlySelectedCase, searchResults, selectedSearchSourceTypes, searchError, searchInfo, isSearching, runSearch, setSearchQuery, setSearchOnlySelectedCase, setSelectedSearchSourceTypes, documentActions, updateCasePreventionProcess, openProcessTemplateModal, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseEqualizationProcess, createEqualizationSecureNote, updateCaseParticipationProcess, openCaseProcessDraft, updateCaseWorkplaceAccommodationProcess, startEditNote, deleteNote, openNewNoteModal, inlineCommands, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, error, isCaseCreateModalOpen, setCaseNumber, setDisplayName, setCategory, setSummary, setSelectedProtectedPersonId, cancelCaseCreateModal, addCase, addAnonymousCase, isNoteModalOpen, editingNote, noteTitle, noteDate, noteType, participants, content, nextSteps, cases, linkedCaseIds, confidentialLevel, containsHealthData, noteError, noteInfo, setNoteTitle, setNoteDate, setNoteType, setParticipants, setConfidentialLevel, setContainsHealthData, toggleLinkedCase, cancelNoteModal, saveNote, caseProcessDraft, setCaseProcessDraft, createCaseProcessFromDraft, contacts, processTemplateModal, setProcessTemplateModal, renderAndDownloadProcessTemplate, legacyBindingCase, legacyBindingError, openLegacyBindingDialog, onOpenExportHandover: () => setHandoverExportOpen(true), onOpenImportHandover: () => setHandoverImportOpen(true), onContinueExpiredHandover: continueExpiredHandover, closeLegacyBindingDialog: () => setLegacyBindingCase(null), assignLegacyCase, closedLegacyBulkCount, bulkMarkClosedLegacyCases }} />
  </>;
}
