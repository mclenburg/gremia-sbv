import { useCallback, useEffect, useState } from "react";
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
import { formatCaseHandoverExportResultMessage } from "./caseHandoverMessages";
import type { CasesViewProps, CaseToast } from "./casesViewTypes";
import type { CaseCategory, CaseRecord } from "../../core/models/case.model";
import type { ProcessTemplateModalState } from "./ProcessTemplateDocumentsModal";
import type { CaseProcessDraft } from "./casesViewProcessUtils";
import { caseRegisterSliceBounds, clampCaseRegisterPage } from "./casesViewUtils";
import { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import type { CaseProcessType } from "./caseWorkbenchTypes";
import type { CaseProcessDeleteReason } from "../../core/models/case-measure.model";
import { CasePrivacyActionDialog, type CasePrivacyActionMode } from "./CasePrivacyActionDialog";
import { CaseProcessDeleteDialog } from "./CaseProcessDeleteDialog";

function useCaseFormState() {
  const [caseNumber, setCaseNumber] = useState(""); const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<CaseCategory>("bem"); const [summary, setSummary] = useState("");
  const [selectedProtectedPersonId, setSelectedProtectedPersonId] = useState("");
  const [isCaseCreateModalOpen, setIsCaseCreateModalOpen] = useState(false);
  const [legacyBindingCase, setLegacyBindingCase] = useState<CaseRecord | null>(null); const [legacyBindingError, setLegacyBindingError] = useState("");
  const [caseProcessDraft, setCaseProcessDraft] = useState<CaseProcessDraft | null>(null);
  const [processTemplateModal, setProcessTemplateModal] = useState<ProcessTemplateModalState | null>(null);
  const [error, setError] = useState(""); const [documentError, setDocumentError] = useState("");
  return { caseNumber, setCaseNumber, displayName, setDisplayName, category, setCategory, summary, setSummary,
    selectedProtectedPersonId, setSelectedProtectedPersonId, isCaseCreateModalOpen, setIsCaseCreateModalOpen,
    legacyBindingCase, setLegacyBindingCase, legacyBindingError, setLegacyBindingError, caseProcessDraft, setCaseProcessDraft,
    processTemplateModal, setProcessTemplateModal, error, setError, documentError, setDocumentError };
}

function useCaseRegister(cases: CaseRecord[]) {
  const [caseFilter, setCaseFilter] = useState(""); const [caseRegisterPage, setCaseRegisterPage] = useState(1);
  const filteredCases = useCaseRegisterFilter(cases, caseFilter); const caseRegisterPageSize = 5;
  const caseRegisterPageCount = Math.max(1, Math.ceil(filteredCases.length / caseRegisterPageSize));
  const normalizedCaseRegisterPage = clampCaseRegisterPage(caseRegisterPage, caseRegisterPageCount);
  const slice = caseRegisterSliceBounds(normalizedCaseRegisterPage, caseRegisterPageSize);
  return { caseFilter, setCaseFilter, setCaseRegisterPage, filteredCases, caseRegisterPageSize, caseRegisterPageCount,
    normalizedCaseRegisterPage, visibleCases: filteredCases.slice(slice.start, slice.end) };
}

function selectedEntities(workbench: ReturnType<typeof useCaseWorkbenchData>, searchResults: ReturnType<typeof useCaseWorkbenchSearch>["searchResults"]) {
  const { selection, notes, documents, casePreventionProcesses, caseBemProcesses, caseEqualizationProcesses,
    caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses } = workbench;
  const selectedNote = selection.type === "note" ? notes.find((x) => x.id === selection.id) : undefined;
  const selectedDocument = selection.type === "document" ? documents.find((x) => x.id === selection.id) : undefined;
  const selectedSearchResult = selection.type === "search" ? searchResults.find((x) => `${x.sourceType}:${x.sourceId}` === selection.id) : undefined;
  const selectedPreventionProcess = selection.type === "process" && selection.processType === "prevention" && selection.id ? casePreventionProcesses.find((x) => x.id === selection.id) : undefined;
  const selectedBemProcess = selection.type === "process" && selection.processType === "bem" && selection.id ? caseBemProcesses.find((x) => x.id === selection.id) : undefined;
  const selectedEqualizationProcess = selection.type === "process" && selection.processType === "equalization" && selection.id ? caseEqualizationProcesses.find((x) => x.id === selection.id) : undefined;
  const selectedTerminationProcess = selection.type === "process" && selection.processType === "termination_hearing" && selection.id ? caseTerminationProcesses.find((x) => x.id === selection.id) : undefined;
  const selectedParticipationProcess = selection.type === "process" && selection.processType === "participation" && selection.id ? caseParticipationProcesses.find((x) => x.id === selection.id) : undefined;
  const selectedWorkplaceAccommodationProcess = selection.type === "process" && selection.processType === "workplace_accommodation" && selection.id ? caseWorkplaceAccommodationProcesses.find((x) => x.id === selection.id) : undefined;
  const selectedEqualizationNotes = selectedEqualizationProcess ? notes.filter((note) => (note.content ?? "").includes(`[[equalization:${selectedEqualizationProcess.id}]]`)) : [];
  return { selectedNote, selectedDocument, selectedSearchResult, selectedPreventionProcess, selectedBemProcess, selectedEqualizationProcess,
    selectedTerminationProcess, selectedParticipationProcess, selectedWorkplaceAccommodationProcess, selectedEqualizationNotes };
}

function useCaseFeedback(input: { noteInfo: string; setNoteInfo: (value: string) => void; noteError: string; setNoteError: (value: string) => void;
  documentError: string; setDocumentError: (value: string) => void; searchError: string; setSearchError: (value: string) => void;
  error: string; caseLoadError: string; ensureSelectedCaseLink: () => void; selectedCaseId: string; editingNote: unknown }) {
  const { noteInfo, setNoteInfo, noteError, setNoteError, documentError, setDocumentError, searchError, setSearchError,
    error, caseLoadError, ensureSelectedCaseLink, selectedCaseId, editingNote } = input;
  const announce = useAnnouncer(); const [caseToast, setCaseToast] = useState<CaseToast | null>(null);
  const pushCaseToast = useCallback((text: string, variant: "ok" | "warning" = "ok") => {
    const id = Date.now(); setCaseToast({ id, text, variant });
    window.setTimeout(() => setCaseToast((current) => current?.id === id ? null : current), 4200);
  }, []);
  useEffect(() => { if (noteInfo) announce(noteInfo, "polite"); }, [noteInfo, announce]);
  useEffect(() => { const message = noteError || documentError || error || caseLoadError; if (message) announce(message, "assertive"); }, [noteError, documentError, error, caseLoadError, announce]);
  useEffect(() => { if (caseToast?.text) announce(caseToast.text, caseToast.variant === "warning" ? "assertive" : "polite"); }, [caseToast, announce]);
  useEffect(() => { ensureSelectedCaseLink(); }, [selectedCaseId, editingNote, ensureSelectedCaseLink]);
  useEffect(() => { if (!noteInfo) return; pushCaseToast(noteInfo, "ok"); setNoteInfo(""); }, [noteInfo, setNoteInfo, pushCaseToast]);
  useEffect(() => { if (!noteError) return; pushCaseToast(noteError, "warning"); setNoteError(""); }, [noteError, setNoteError, pushCaseToast]);
  useEffect(() => { if (!documentError) return; pushCaseToast(documentError, "warning"); setDocumentError(""); }, [documentError, setDocumentError, pushCaseToast]);
  useEffect(() => { if (!searchError) return; pushCaseToast(searchError, "warning"); setSearchError(""); }, [searchError, setSearchError, pushCaseToast]);
  return { announce, caseToast, pushCaseToast };
}

function useCaseHandoverActions(selectedCase: CaseRecord | undefined, setSelectedCaseId: (id: string) => void,
  onCasesChanged: () => void | Promise<void>, pushCaseToast: (text: string, variant?: "ok" | "warning") => void) {
  const [handoverExportOpen, setHandoverExportOpen] = useState(false); const [handoverImportOpen, setHandoverImportOpen] = useState(false);
  const exportSelectedCaseHandover = async (passphrase: string, expiresAt?: string) => {
    if (!selectedCase) throw new Error("Bitte zuerst eine Fallakte auswählen.");
    const result = await window.gremiaSbv.caseHandover.export({ caseIds: [selectedCase.id], expiresAt, purpose: "Urlaubsübergabe / SBV-Vertretung", passphrase }, `${selectedCase.caseNumber}-falluebergabe.gsbvtransfer`);
    pushCaseToast(formatCaseHandoverExportResultMessage(result), result.exported ? "ok" : "warning"); return result;
  };
  const importCaseHandover = async (input: { filePath: string; passphrase: string; mode: "create_new" | "merge_existing"; targetCaseId?: string }) => {
    const result = await window.gremiaSbv.caseHandover.import(input);
    pushCaseToast(result.mode === "merge_existing" ? "Übergabepaket wurde mit der gewählten Akte zusammengeführt." : "Übergabepaket wurde als neue lokale Übergabeakte importiert.");
    await onCasesChanged(); const nextCaseId = result.updatedCaseIds[0] ?? result.createdCaseIds[0]; if (nextCaseId) setSelectedCaseId(nextCaseId);
  };
  const continueExpiredHandover = async () => {
    if (!selectedCase) return; const reason = window.prompt("Begründung für die weitere Bearbeitung abgelaufener Übergabedaten:"); if (!reason) return;
    try { await window.gremiaSbv.caseHandover.continueExpired(selectedCase.id, reason); pushCaseToast("Weitere Bearbeitung der abgelaufenen Übergabedaten wurde bestätigt."); await onCasesChanged(); }
    catch (error) { pushCaseToast(error instanceof Error ? error.message : "Bestätigung konnte nicht dokumentiert werden.", "warning"); }
  };
  return { handoverExportOpen, setHandoverExportOpen, handoverImportOpen, setHandoverImportOpen, exportSelectedCaseHandover,
    selectCaseHandoverFile: () => window.gremiaSbv.caseHandover.selectFile(), inspectCaseHandover: (filePath: string, passphrase: string) => window.gremiaSbv.caseHandover.inspect(filePath, passphrase),
    importCaseHandover, continueExpiredHandover };
}

function useCaseKeyboardShortcuts(openCaseCreateModal: () => void) {
  useEffect(() => {
    const open = () => openCaseCreateModal();
    const focus = () => { const target = document.querySelector<HTMLInputElement>('[data-global-search-target="cases"]'); target?.focus(); target?.select(); };
    window.addEventListener("gremia-sbv:create-case", open); window.addEventListener("gremia-sbv:focus-search", focus);
    return () => { window.removeEventListener("gremia-sbv:create-case", open); window.removeEventListener("gremia-sbv:focus-search", focus); };
  }, [openCaseCreateModal]);
}

export function CasesView(props: CasesViewProps) {
  const { cases, contacts, protectedPersons, target, onCreateCase, onCreateDeadline, onCreateContact, onCasesChanged, onTargetConsumed, onOpenParticipationViolationPrefill } = props;
  const form = useCaseFormState(); const register = useCaseRegister(cases); const confirmDialog = useConfirmDialog();
  const [casePrivacyTarget, setCasePrivacyTarget] = useState<CaseRecord | null>(null);
  const [processDeleteTarget, setProcessDeleteTarget] = useState<{ id: string; processType: CaseProcessType; label?: string } | null>(null);
  const [caseLoadError, setCaseLoadError] = useState("");
  const workbench = useCaseWorkbenchData({ cases, target, onTargetConsumed, onError: setCaseLoadError });
  const search = useCaseWorkbenchSearch({ selectedCaseId: workbench.selectedCaseId, onSelect: workbench.setSelection });
  const selected = selectedEntities(workbench, search.searchResults);
  const noteEditor = useCaseNoteEditor({ selectedCaseId: workbench.selectedCaseId, searchQuery: search.searchQuery,
    reloadSelectedCaseChildren: workbench.reloadSelectedCaseChildren, runSearch: search.runSearch, setSelection: workbench.setSelection });
  const setNoteError = noteEditor.setNoteError;
  useEffect(() => { if (caseLoadError) setNoteError(caseLoadError); }, [caseLoadError, setNoteError]);
  const inlineCommands = useInlineCommands({ selectedCaseId: workbench.selectedCaseId, selectedCase: workbench.selectedCase,
    noteTitle: noteEditor.noteTitle, content: noteEditor.content, setContent: noteEditor.setContent, nextSteps: noteEditor.nextSteps,
    setNextSteps: noteEditor.setNextSteps, confidentialLevel: noteEditor.confidentialLevel, setConfidentialLevel: noteEditor.setConfidentialLevel,
    setLinkedCaseIds: noteEditor.setLinkedCaseIds, setCaseLegalReferences: workbench.setCaseLegalReferences, setNoteInfo: noteEditor.setNoteInfo,
    setNoteError: noteEditor.setNoteError, onCreateDeadline, onCreateContact, onEntityLinkCreated: noteEditor.addEntityLink,
    onStructuredActionCreated: async () => { await workbench.reloadSelectedCaseChildren(); await onCasesChanged(); } });
  noteEditor.bindClearInlineDrafts(inlineCommands.clearInlineDrafts);
  const feedback = useCaseFeedback({ noteInfo: noteEditor.noteInfo, setNoteInfo: noteEditor.setNoteInfo, noteError: noteEditor.noteError,
    setNoteError: noteEditor.setNoteError, documentError: form.documentError, setDocumentError: form.setDocumentError,
    searchError: search.searchError, setSearchError: search.setSearchError, error: form.error, caseLoadError,
    ensureSelectedCaseLink: noteEditor.ensureSelectedCaseLink, selectedCaseId: workbench.selectedCaseId, editingNote: noteEditor.editingNote });
  const processUpdates = useCaseProcessUpdates({ setNoteError: noteEditor.setNoteError, setNoteInfo: noteEditor.setNoteInfo,
    reloadSelectedCaseChildren: workbench.reloadSelectedCaseChildren, selectedCase: workbench.selectedCase });
  const templates = useProcessTemplateActions({ processTemplateModal: form.processTemplateModal, setProcessTemplateModal: form.setProcessTemplateModal,
    selectedCase: workbench.selectedCase, confirmDialog });
  const processCreation = useCaseProcessCreation({ selectedCase: workbench.selectedCase, selectedCaseId: workbench.selectedCaseId,
    caseProcessDraft: form.caseProcessDraft, setCaseProcessDraft: form.setCaseProcessDraft, setSelection: workbench.setSelection,
    setNoteError: noteEditor.setNoteError, setNoteInfo: noteEditor.setNoteInfo, reloadSelectedCaseChildren: workbench.reloadSelectedCaseChildren, onCasesChanged });
  const crud = useCaseCrudActions({ setError: form.setError, setIsCaseCreateModalOpen: form.setIsCaseCreateModalOpen, caseNumber: form.caseNumber,
    displayName: form.displayName, category: form.category, summary: form.summary, selectedProtectedPersonId: form.selectedProtectedPersonId,
    protectedPersons, onCreateCase, onCasesChanged, setCaseNumber: form.setCaseNumber, setDisplayName: form.setDisplayName, setSummary: form.setSummary,
    setSelectedProtectedPersonId: form.setSelectedProtectedPersonId, setNoteError: noteEditor.setNoteError, editingNote: noteEditor.editingNote, noteEditor,
    reloadSelectedCaseChildren: workbench.reloadSelectedCaseChildren, setSelection: workbench.setSelection, searchQuery: search.searchQuery, runSearch: search.runSearch,
    setDocumentError: form.setDocumentError, selectedCaseId: workbench.selectedCaseId, selectedCase: workbench.selectedCase, confirmDialog, announce: feedback.announce });
  useCaseKeyboardShortcuts(crud.openCaseCreateModal);
  const legacy = useLegacyCaseBindingHandlers({ onCasesChanged, announce: feedback.announce });
  const handover = useCaseHandoverActions(workbench.selectedCase, workbench.setSelectedCaseId, onCasesChanged, feedback.pushCaseToast);
  const closedLegacyBulkCount = cases.filter((record) => record.status === "abgeschlossen" && record.personBindingState === "legacy_unlinked" && !record.anonymizationRecommended).length;
  const bulkMarkClosedLegacyCases = async () => { try { const result = await legacy.bulkMarkClosedLegacyCases(); feedback.pushCaseToast(result.message ?? `${result.marked} abgeschlossene Altakten wurden vorgemerkt.`); }
    catch (error) { feedback.pushCaseToast(error instanceof Error ? error.message : "Altakten konnten nicht vorgemerkt werden.", "warning"); } };
  const openLegacyBindingDialog = (record: CaseRecord) => { form.setLegacyBindingError(""); form.setLegacyBindingCase(record); };
  const assignLegacyCase = async (protectedPersonId: string, reason: string) => { if (!form.legacyBindingCase) return; form.setLegacyBindingError("");
    try { await legacy.bindLegacyCase(form.legacyBindingCase, protectedPersonId, reason); const id = form.legacyBindingCase.id; form.setLegacyBindingCase(null); workbench.setSelectedCaseId(id); }
    catch (error) { form.setLegacyBindingError(error instanceof Error ? error.message : "Legacy-Zuordnung konnte nicht gespeichert werden."); } };
  const runCasePrivacyAction = async (input: { mode: CasePrivacyActionMode; reason: string; confirmation: string }) => {
    if (!casePrivacyTarget) return;
    const payload = { caseId: casePrivacyTarget.id, reason: input.reason, confirmation: input.confirmation };
    const result = input.mode === 'anonymize' ? await window.gremiaSbv.privacyReview.anonymizeCase(payload) : await window.gremiaSbv.privacyReview.deleteCase(payload);
    if (!result.ok) throw new Error(result.error ?? 'Die Datenschutzaktion konnte nicht abgeschlossen werden.');
    feedback.pushCaseToast(result.message ?? (input.mode === 'anonymize' ? 'Fallakte wurde anonymisiert.' : 'Fallakte wurde gelöscht.'));
    if (input.mode === 'delete' && workbench.selectedCaseId === casePrivacyTarget.id) {
      workbench.setSelectedCaseId('');
      workbench.setSelection({ type: 'overview' });
    }
    await onCasesChanged();
    if (input.mode === 'anonymize' && workbench.selectedCaseId === casePrivacyTarget.id) await workbench.reloadSelectedCaseChildren();
  };
  const deleteCaseProcess = async (reasonCode: CaseProcessDeleteReason) => {
    if (!processDeleteTarget || !workbench.selectedCaseId) return;
    const result = await window.gremiaSbv.caseMeasures.deleteProcess({ caseId: workbench.selectedCaseId, processId: processDeleteTarget.id, processType: processDeleteTarget.processType, reasonCode });
    workbench.setSelection({ type: 'overview' });
    await workbench.reloadSelectedCaseChildren();
    await onCasesChanged();
    feedback.pushCaseToast(`Maßnahme wurde gelöscht. ${result.deletedNotes} Maßnahmennotiz(en) und ${result.deletedDeadlines} Frist(en) wurden entfernt${result.detachedDocuments ? `; ${result.detachedDocuments} Dokument(en) bleiben in der Fallakte erhalten.` : '.'}`);
  };
  const documentActions = createCaseDocumentActions({ importDocuments: crud.importDocuments, openDocument: crud.openDocument, exportDocument: crud.exportDocument, deleteDocument: crud.deleteDocument });
  return <><CaseHandoverTransferDialogs exportOpen={handover.handoverExportOpen} importOpen={handover.handoverImportOpen} selectedCase={workbench.selectedCase}
    onCloseExport={() => handover.setHandoverExportOpen(false)} onCloseImport={() => handover.setHandoverImportOpen(false)} onExport={handover.exportSelectedCaseHandover}
    onSelectImportFile={handover.selectCaseHandoverFile} onInspectImport={handover.inspectCaseHandover} onImport={handover.importCaseHandover} />
    <CasesViewRender {...register} {...workbench} {...search} {...selected} {...form} {...processUpdates} {...templates} {...processCreation} {...noteEditor} {...crud}
      cases={cases} contacts={contacts} protectedPersons={protectedPersons} caseToast={feedback.caseToast} documentActions={documentActions} inlineCommands={inlineCommands}
      onOpenExportHandover={() => handover.setHandoverExportOpen(true)} onOpenImportHandover={() => handover.setHandoverImportOpen(true)}
      onContinueExpiredHandover={handover.continueExpiredHandover} closeLegacyBindingDialog={() => form.setLegacyBindingCase(null)} openLegacyBindingDialog={openLegacyBindingDialog}
      assignLegacyCase={assignLegacyCase} closedLegacyBulkCount={closedLegacyBulkCount} bulkMarkClosedLegacyCases={bulkMarkClosedLegacyCases}
      onOpenParticipationViolationPrefill={onOpenParticipationViolationPrefill} onOpenCasePrivacyAction={setCasePrivacyTarget} onOpenProcessDelete={setProcessDeleteTarget} />
    <CasePrivacyActionDialog open={Boolean(casePrivacyTarget)} record={casePrivacyTarget ?? undefined} onClose={() => setCasePrivacyTarget(null)} onSubmit={runCasePrivacyAction} />
    <CaseProcessDeleteDialog target={processDeleteTarget} onClose={() => setProcessDeleteTarget(null)} onDelete={deleteCaseProcess} /></>;
}
