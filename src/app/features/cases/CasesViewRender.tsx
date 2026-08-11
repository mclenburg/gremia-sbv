import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { ModuleFrame } from "../../shared/components/ModuleFrame";
import { DangerButton, ToolbarButton } from "../../shared/components/IndustrialButton";
import { CaseRegister } from "./CaseRegister";
import { CaseTreePanel } from "./CaseTreePanel";
import { CaseDetailPanel } from "./CaseDetailPanel";
import { CaseOverviewDetail } from "./CaseOverviewDetail";
import { CaseDocumentDetail } from "./CaseDocumentDetail";
import { CaseCreateModal } from "./CaseCreateModal";
import { LegacyCaseBindingDialog } from "./LegacyCaseBindingDialog";
import { CaseNoteModal } from "./CaseNoteModal";
import { CaseProcessDraftModal } from "./CaseProcessDraftModal";
import { CaseWorkbenchFooter } from "./CaseWorkbenchFooter";
import { InlineCommandOverlays } from "./InlineCommandOverlays";
import { ProcessTemplateDocumentsModal } from "./ProcessTemplateDocumentsModal";
import { ContextualTemplateButton } from "./ContextualTemplateButton";
import { MeasureNotesPanel } from "./measures/MeasureNotesPanel";
import { CaseNoteEntityLinks } from "./CaseNoteEntityLinks";
import { PreventionProcessDetail } from "../prevention/PreventionProcessDetail";
import { BemProcessDetail } from "../bem/BemProcessDetail";
import { EqualizationProcessDetail } from "../equalization/EqualizationProcessDetail";
import { TerminationProcessDetail } from "../termination/TerminationProcessDetail";
import { ParticipationProcessDetail } from "../participation/ParticipationProcessDetail";
import { WorkplaceAccommodationProcessDetail } from "../workplace-accommodation/WorkplaceAccommodationProcessDetail";
import { resolveContextualTemplateAction } from "@services/templateContextPolicy";
import { formatBytes, formatNoteDate, formatProcessNodeSubtitle, processTypeLabel } from "./caseWorkbenchFormat";
import type { CaseSearchResult } from '../../core/models/case-note.model';
import type { CaseProcessType } from './caseWorkbenchTypes';
import type { CasesViewRenderProps } from './casesViewRenderTypes';
function renderSearchExcerpt(result: CaseSearchResult) {
  const segments = result.excerptSegments?.length ? result.excerptSegments : [{ text: result.excerpt, match: false }];
  return segments.map((segment, index) => segment.match
    ? <mark key={`${segment.text}-${index}`}>{segment.text}</mark>
    : <span key={`${segment.text}-${index}`}>{segment.text}</span>);
}

function selectSearchResult(result: CaseSearchResult, props: CasesViewRenderProps) {
  if (result.caseId && result.caseId !== props.selectedCaseId) props.setSelectedCaseId(result.caseId);
  const targetId = result.navigationId ?? result.sourceId;
  if (result.navigationKind === "note") return props.setSelection({ type: "note", id: targetId });
  if (result.navigationKind === "document") return props.setSelection({ type: "document", id: targetId });
  const processTypeBySource: Partial<Record<CaseSearchResult["sourceType"], CaseProcessType>> = {
    bem: "bem", bem_event: "bem", prevention: "prevention", prevention_event: "prevention",
    termination: "termination_hearing", equalization: "equalization", participation: "participation",
    participation_event: "participation", workplace_accommodation: "workplace_accommodation",
  };
  const processType = processTypeBySource[result.sourceType];
  if (result.navigationKind === "process" && processType) {
    props.setSelection({ type: "process", processType, id: targetId });
    return;
  }
  props.setSelection({ type: "search", id: `${result.sourceType}:${result.sourceId}` });
}

function CaseOverviewContent({ props }: { props: CasesViewRenderProps }) {
  const { selection, selectedCase, notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses,
    caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses,
    openLegacyBindingDialog } = props;
  if (selection.type !== "overview") return null;
  const action = resolveContextualTemplateAction({ sourceType: "case", title: "Fallübersicht" });
  const contextualTemplateActions = selectedCase && action ? (
    <div className="contextual-template-actions">
      <ContextualTemplateButton action={action} caseId={selectedCase.id} values={{
        "fall.aktenzeichen": selectedCase.caseNumber,
        "fall.name": selectedCase.displayName,
        "fall.kurzbeschreibung": selectedCase.summary ?? "",
      }} />
    </div>
  ) : null;
  const processesCount = casePreventionProcesses.length + caseBemProcesses.length + caseEqualizationProcesses.length +
    caseTerminationProcesses.length + caseParticipationProcesses.length + caseWorkplaceAccommodationProcesses.length;
  return <CaseOverviewDetail selectedCase={selectedCase} notesCount={notes.length} documentsCount={documents.length}
    legalReferencesCount={caseLegalReferences.length} processesCount={processesCount}
    onOpenLegacyBinding={selectedCase?.personBindingState === "legacy_unlinked" ? () => openLegacyBindingDialog(selectedCase) : undefined}
    onContinueExpiredHandover={props.onContinueExpiredHandover} contextualTemplateActions={contextualTemplateActions} />;
}

function PrimaryProcessContent({ props }: { props: CasesViewRenderProps }) {
  const { selection, selectedCase, selectedPreventionProcess, selectedBemProcess, selectedTerminationProcess,
    updateCasePreventionProcess, updateCaseBemProcess, updateCaseTerminationProcess, openProcessTemplateModal } = props;
  if (selection.type !== "process") return null;
  if (selection.processType === "prevention") return <>
    <PreventionProcessDetail processType={selection.processType} process={selectedPreventionProcess}
      onUpdate={updateCasePreventionProcess} onOpenTemplates={openProcessTemplateModal} />
    {selectedPreventionProcess && selectedCase && <MeasureNotesPanel caseId={selectedCase.id} measureType="prevention"
      measureId={selectedPreventionProcess.id} measureTitle="Präventionsverfahren" />}
  </>;
  if (selection.processType === "bem") return <>
    <BemProcessDetail processType={selection.processType} process={selectedBemProcess}
      onUpdate={updateCaseBemProcess} onOpenTemplates={openProcessTemplateModal} />
    {selectedBemProcess && selectedCase && <MeasureNotesPanel caseId={selectedCase.id} measureType="bem"
      measureId={selectedBemProcess.id} measureTitle={selectedBemProcess.title} />}
  </>;
  if (selection.processType === "termination_hearing" && selectedTerminationProcess) return <>
    <TerminationProcessDetail process={selectedTerminationProcess} onUpdate={updateCaseTerminationProcess}
      onOpenTemplates={openProcessTemplateModal} />
    {selectedCase && <MeasureNotesPanel caseId={selectedCase.id} measureType="termination_hearing"
      measureId={selectedTerminationProcess.id} measureTitle="Kündigungsanhörung" />}
  </>;
  return null;
}

function SecondaryProcessContent({ props }: { props: CasesViewRenderProps }) {
  const { selection, selectedCase, selectedEqualizationProcess, selectedEqualizationNotes, selectedParticipationProcess,
    selectedWorkplaceAccommodationProcess, updateCaseEqualizationProcess, createEqualizationSecureNote,
    updateCaseParticipationProcess, updateCaseWorkplaceAccommodationProcess, openProcessTemplateModal,
    onOpenParticipationViolationPrefill } = props;
  if (selection.type !== "process") return null;
  if (selection.processType === "equalization" && selectedEqualizationProcess) return <>
    <EqualizationProcessDetail process={selectedEqualizationProcess} onUpdate={updateCaseEqualizationProcess}
      onOpenTemplates={openProcessTemplateModal} secureNotes={selectedEqualizationNotes}
      onCreateSecureNote={createEqualizationSecureNote} />
    {selectedCase && <MeasureNotesPanel caseId={selectedCase.id} measureType="equalization"
      measureId={selectedEqualizationProcess.id} measureTitle="Gleichstellung / GdB" />}
  </>;
  if (selection.processType === "participation" && selectedParticipationProcess) return <>
    <ParticipationProcessDetail process={selectedParticipationProcess} caseRecord={selectedCase}
      onUpdate={updateCaseParticipationProcess} onOpenViolationPrefill={onOpenParticipationViolationPrefill} />
    {selectedCase && <MeasureNotesPanel caseId={selectedCase.id} measureType="participation"
      measureId={selectedParticipationProcess.id} measureTitle={selectedParticipationProcess.title} />}
  </>;
  if (selection.processType === "workplace_accommodation" && selectedWorkplaceAccommodationProcess) return <>
    <WorkplaceAccommodationProcessDetail process={selectedWorkplaceAccommodationProcess}
      onUpdate={updateCaseWorkplaceAccommodationProcess} />
    {selectedCase && <MeasureNotesPanel caseId={selectedCase.id} measureType="workplace_accommodation"
      measureId={selectedWorkplaceAccommodationProcess.id} measureTitle={selectedWorkplaceAccommodationProcess.title} />}
  </>;
  return null;
}

function CaseResourceContent({ props }: { props: CasesViewRenderProps }) {
  const { selectedNote, selectedDocument, selectedSearchResult, setSelection, setSelectedCaseId, documentActions,
    startEditNote, deleteNote } = props;
  return <>
    {selectedNote && <article className="case-detail-content">
      <div className="case-note-card-header"><span className="industrial-badge">{selectedNote.noteType}</span>
        <time>{formatNoteDate(selectedNote.noteDate)}</time></div>
      <h2>{selectedNote.title}</h2>
      {selectedNote.participants && <p className="industrial-meta">Beteiligte: {selectedNote.participants}</p>}
      {!!selectedNote.caseNumbers?.length && <p className="industrial-meta">Fallbezüge: {selectedNote.caseNumbers.join(", ")}</p>}
      <p className="case-note-content">{selectedNote.content}</p>
      <CaseNoteEntityLinks links={selectedNote.links} onSelect={setSelection} />
      {selectedNote.nextSteps && <p className="case-note-next"><strong>Nächste Schritte:</strong> {selectedNote.nextSteps}</p>}
      <div className="industrial-card-actions">
        <ToolbarButton onClick={() => startEditNote(selectedNote)}>Bearbeiten</ToolbarButton>
        <DangerButton compact onClick={() => void deleteNote(selectedNote)}>
          <Trash2 className="h-4 w-4" /> Löschen</DangerButton>
      </div>
    </article>}
    <CaseDocumentDetail document={selectedDocument} formatNoteDate={formatNoteDate} formatBytes={formatBytes}
      onOpen={(document) => void documentActions.openDocument(document)}
      onExport={(document) => void documentActions.exportDocument(document)}
      onDelete={(document) => void documentActions.deleteDocument(document)} />
    {selectedSearchResult && !selectedNote && !selectedDocument && <article className="case-detail-content">
      <h2>{selectedSearchResult.title}</h2><p>{renderSearchExcerpt(selectedSearchResult)}</p>
      <button type="button" className="industrial-secondary-button" onClick={() => setSelectedCaseId(selectedSearchResult.caseId)}>
        Fallakte öffnen</button>
    </article>}
  </>;
}

function CaseWorkbench({ props }: { props: CasesViewRenderProps }) {
  const { selectedCase, notes, documents, casePreventionProcesses, caseBemProcesses, caseEqualizationProcesses,
    caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses, isCaseChildrenLoading,
    selection, setSelection, searchQuery, searchOnlySelectedCase, searchResults, searchError, searchInfo, isSearching,
    selectedSearchSourceTypes, runSearch, setSearchQuery, setSearchOnlySelectedCase, setSelectedSearchSourceTypes,
    selectedCaseId, openNewNoteModal, documentActions, inlineCommands, openCaseProcessDraft } = props;
  return <section className="case-workbench">
    <CaseTreePanel selectedCase={selectedCase} notes={notes} documents={documents} preventionProcesses={casePreventionProcesses}
      bemProcesses={caseBemProcesses} equalizationProcesses={caseEqualizationProcesses} terminationProcesses={caseTerminationProcesses}
      participationProcesses={caseParticipationProcesses} workplaceAccommodationProcesses={caseWorkplaceAccommodationProcesses}
      isLoading={isCaseChildrenLoading} selection={selection} onSelect={setSelection} onDeleteProcess={props.onOpenProcessDelete}
      formatProcessNodeSubtitle={formatProcessNodeSubtitle} formatNoteDate={formatNoteDate} formatBytes={formatBytes} />
    <CaseDetailPanel searchQuery={searchQuery} searchOnlySelectedCase={searchOnlySelectedCase} searchResults={searchResults}
      searchError={searchError} searchInfo={searchInfo} isSearching={isSearching} selectedSearchSourceTypes={selectedSearchSourceTypes}
      onSearchSubmit={runSearch} onSearchQueryChange={setSearchQuery} onSearchOnlySelectedCaseChange={setSearchOnlySelectedCase}
      onSearchSourceTypesChange={setSelectedSearchSourceTypes} onSelectSearchResult={(result) => selectSearchResult(result, props)}
      onExportHandover={props.onOpenExportHandover} canExportHandover={Boolean(selectedCase)}>
      <CaseOverviewContent props={props} />
      <PrimaryProcessContent props={props} />
      <SecondaryProcessContent props={props} />
      <CaseResourceContent props={props} />
      <CaseWorkbenchFooter disabled={!selectedCaseId} onNewNote={openNewNoteModal}
        onImportDocument={() => void documentActions.importDocuments()} onDeadline={inlineCommands.openCaseDeadlineDraft}
        onProcess={openCaseProcessDraft} />
    </CaseDetailPanel>
  </section>;
}

function CaseDialogs({ props }: { props: CasesViewRenderProps }) {
  const { isCaseCreateModalOpen, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, error,
    setCaseNumber, setDisplayName, setCategory, setSummary, setSelectedProtectedPersonId, cancelCaseCreateModal, addCase,
    addAnonymousCase, legacyBindingCase, legacyBindingError, closeLegacyBindingDialog, assignLegacyCase, isNoteModalOpen,
    editingNote, noteTitle, noteDate, noteType, participants, content, nextSteps, cases, linkedCaseIds, selectedCaseId,
    confidentialLevel, containsHealthData, noteError, noteInfo, setNoteTitle, setNoteDate, setNoteType, setParticipants,
    setConfidentialLevel, setContainsHealthData, toggleLinkedCase, cancelNoteModal, saveNote, inlineCommands, caseProcessDraft,
    setCaseProcessDraft, createCaseProcessFromDraft, contacts, selectedCase } = props;
  return <>
    <CaseCreateModal open={isCaseCreateModalOpen} caseNumber={caseNumber} displayName={displayName} category={category}
      summary={summary} selectedProtectedPersonId={selectedProtectedPersonId} protectedPersons={protectedPersons} error={error}
      onCaseNumberChange={setCaseNumber} onDisplayNameChange={setDisplayName} onCategoryChange={setCategory}
      onSummaryChange={setSummary} onProtectedPersonChange={setSelectedProtectedPersonId} onCancel={cancelCaseCreateModal}
      onSubmit={addCase} onAnonymousSubmit={addAnonymousCase} />
    <LegacyCaseBindingDialog open={Boolean(legacyBindingCase)} legacyCase={legacyBindingCase ?? undefined} persons={protectedPersons}
      error={legacyBindingError} onClose={closeLegacyBindingDialog} onAssign={assignLegacyCase} />
    <CaseNoteModal open={isNoteModalOpen} editingNote={editingNote} noteTitle={noteTitle} noteDate={noteDate} noteType={noteType}
      participants={participants} content={content} nextSteps={nextSteps} cases={cases} linkedCaseIds={linkedCaseIds}
      selectedCaseId={selectedCaseId} confidentialLevel={confidentialLevel} containsHealthData={containsHealthData}
      noteError={noteError} noteInfo={noteInfo} onTitleChange={setNoteTitle} onDateChange={setNoteDate}
      onNoteTypeChange={setNoteType} onParticipantsChange={setParticipants} onProtocolTextChange={inlineCommands.handleProtocolTextChange}
      onProtocolTextCommand={inlineCommands.handleProtocolTextCommand} onToggleLinkedCase={toggleLinkedCase}
      onConfidentialLevelChange={setConfidentialLevel} onContainsHealthDataChange={setContainsHealthData}
      onCancel={cancelNoteModal} onSubmit={saveNote} />
    <CaseProcessDraftModal draft={caseProcessDraft} onChange={setCaseProcessDraft} onCancel={() => setCaseProcessDraft(null)}
      onCreate={() => void createCaseProcessFromDraft()} />
    <InlineCommandOverlays cases={cases} contacts={contacts} selectedCase={selectedCase} {...inlineCommands.overlayProps} />
  </>;
}

export function CasesViewRender(props: CasesViewRenderProps) {
  const { caseToast, filteredCases, visibleCases, selectedCaseId, caseFilter, setCaseFilter, setCaseRegisterPage,
    normalizedCaseRegisterPage, caseRegisterPageCount, caseRegisterPageSize, openCaseCreateModal, closedLegacyBulkCount,
    bulkMarkClosedLegacyCases, processTemplateModal, setProcessTemplateModal, renderAndDownloadProcessTemplate } = props;
  return <>
    {caseToast && <div className={`case-toast case-toast-${caseToast.variant}`} role="status" aria-live="assertive">
      {caseToast.variant === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      <span>{caseToast.text}</span>
    </div>}
    <ProcessTemplateDocumentsModal state={processTemplateModal} onClose={() => setProcessTemplateModal(null)}
      onDownload={(template) => void renderAndDownloadProcessTemplate(template)} processTypeLabel={processTypeLabel} />
    <ModuleFrame title="Fälle" kicker="Fallakten" description="Fallakten, Notizen, Prozesse und Unterlagen bearbeiten." compact>
      <CaseRegister filteredCount={filteredCases.length} visibleCases={visibleCases} selectedCaseId={selectedCaseId}
        caseFilter={caseFilter} onCaseFilterChange={(value) => { setCaseFilter(value); setCaseRegisterPage(1); }}
        onSelectCase={props.setSelectedCaseId} onCreateCase={openCaseCreateModal} onImportHandover={props.onOpenImportHandover}
        onPrivacyAction={props.onOpenCasePrivacyAction}
        onBulkMarkClosedLegacyCases={() => void bulkMarkClosedLegacyCases()} closedLegacyBulkCount={closedLegacyBulkCount}
        page={normalizedCaseRegisterPage} pageCount={caseRegisterPageCount} pageSize={caseRegisterPageSize}
        onPageChange={setCaseRegisterPage} />
      <CaseWorkbench props={props} />
    </ModuleFrame>
    <CaseDialogs props={props} />
  </>;
}
