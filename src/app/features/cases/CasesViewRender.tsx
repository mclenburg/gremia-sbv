import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { ModuleFrame } from "../../shared/components/ModuleFrame";
import { CasesViewLayout } from "./CasesViewLayout";
import { CasesViewHeader } from "./CasesViewHeader";
import { CasesViewToolbar } from "./CasesViewToolbar";
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
import { formatBytes, formatCaseLabel, formatNoteDate, formatProcessNodeSubtitle, processTypeLabel } from "./caseWorkbenchFormat";
import type { CaseSearchResult } from "../../core/models/case-note.model";
import type { CaseProcessType } from "./caseWorkbenchTypes";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { CaseCategory, CaseRecord } from "../../core/models/case.model";
import type { CaseDocumentRecord } from "../../core/models/case-document.model";
import type { CaseNoteRecord, CaseNoteType, ConfidentialLevel } from "../../core/models/case-note.model";
import type { ProtectedPersonRecord } from "../../core/models/protected-person.model";
import type { ContactRecord } from "../../core/models/contact.model";
import type { PreventionProcessRecord } from "../../core/models/prevention.model";
import type { BemProcessRecord } from "../../core/models/bem.model";
import type { EqualizationProcessRecord } from "../../core/models/equalization.model";
import type { TerminationHearingRecord } from "../../core/models/termination.model";
import type { ParticipationRecord } from "../../core/models/participation.model";
import type { WorkplaceAccommodationRecord } from "../../core/models/workplace-accommodation.model";
import type { CaseLegalReferenceRecord } from "../../core/models/knowledge.model";
import type { CasesViewProps, CaseToast } from "./casesViewTypes";
import type { CaseExplorerSelection } from "./caseWorkbenchTypes";
import type { CaseProcessDraft } from "./casesViewProcessUtils";
import type { ProcessTemplateModalState } from "./ProcessTemplateDocumentsModal";
import type { useCaseWorkbenchSearch } from "./useCaseWorkbenchSearch";
import type { useInlineCommands } from "./inlineCommands/useInlineCommands";
import type { useCaseProcessUpdates } from "./useCaseProcessUpdates";
import type { useProcessTemplateActions } from "./useProcessTemplateActions";
import type { useCaseProcessCreation } from "./useCaseProcessCreation";
import type { useCaseCrudActions } from "./useCaseCrudActions";
import type { useCaseNoteEditor } from "./useCaseNoteEditor";
import type { CaseDocumentActions } from "./useCaseDocuments";


type SearchState = ReturnType<typeof useCaseWorkbenchSearch>;
type ProcessUpdateActions = ReturnType<typeof useCaseProcessUpdates>;
type TemplateActions = ReturnType<typeof useProcessTemplateActions>;
type ProcessCreationActions = ReturnType<typeof useCaseProcessCreation>;
type CrudActions = ReturnType<typeof useCaseCrudActions>;
type NoteEditorActions = ReturnType<typeof useCaseNoteEditor>;

type CasesViewRenderProps = {
  caseToast: CaseToast | null;
  visibleCases: CaseRecord[];
  selectedCaseId: string;
  filteredCases: CaseRecord[];
  caseFilter: string;
  setCaseFilter: Dispatch<SetStateAction<string>>;
  normalizedCaseRegisterPage: number;
  caseRegisterPageCount: number;
  caseRegisterPageSize: number;
  setCaseRegisterPage: Dispatch<SetStateAction<number>>;
  openCaseCreateModal: CrudActions["openCaseCreateModal"];
  selectedCase?: CaseRecord;
  selectedNote?: CaseNoteRecord;
  selectedDocument?: CaseDocumentRecord;
  selectedSearchResult?: CaseSearchResult;
  selectedPreventionProcess?: PreventionProcessRecord;
  selectedBemProcess?: BemProcessRecord;
  selectedTerminationProcess?: TerminationHearingRecord;
  selectedEqualizationProcess?: EqualizationProcessRecord;
  selectedEqualizationNotes: CaseNoteRecord[];
  selectedParticipationProcess?: ParticipationRecord;
  selectedWorkplaceAccommodationProcess?: WorkplaceAccommodationRecord;
  notes: CaseNoteRecord[];
  documents: CaseDocumentRecord[];
  caseLegalReferences: CaseLegalReferenceRecord[];
  casePreventionProcesses: PreventionProcessRecord[];
  caseBemProcesses: BemProcessRecord[];
  caseEqualizationProcesses: EqualizationProcessRecord[];
  caseTerminationProcesses: TerminationHearingRecord[];
  caseParticipationProcesses: ParticipationRecord[];
  caseWorkplaceAccommodationProcesses: WorkplaceAccommodationRecord[];
  isCaseChildrenLoading: boolean;
  selection: CaseExplorerSelection;
  setSelection: (selection: CaseExplorerSelection) => void;
  setSelectedCaseId: Dispatch<SetStateAction<string>>;
  searchQuery: SearchState["searchQuery"];
  searchOnlySelectedCase: SearchState["searchOnlySelectedCase"];
  searchResults: SearchState["searchResults"];
  selectedSearchSourceTypes: SearchState["selectedSearchSourceTypes"];
  searchError: SearchState["searchError"];
  searchInfo: SearchState["searchInfo"];
  isSearching: SearchState["isSearching"];
  runSearch: SearchState["runSearch"];
  setSearchQuery: SearchState["setSearchQuery"];
  setSearchOnlySelectedCase: SearchState["setSearchOnlySelectedCase"];
  setSelectedSearchSourceTypes: SearchState["setSelectedSearchSourceTypes"];
  documentActions: CaseDocumentActions;
  inlineCommands: ReturnType<typeof useInlineCommands>;
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  summary: string;
  selectedProtectedPersonId: string;
  protectedPersons: ProtectedPersonRecord[];
  error: string;
  isCaseCreateModalOpen: boolean;
  setCaseNumber: Dispatch<SetStateAction<string>>;
  setDisplayName: Dispatch<SetStateAction<string>>;
  setCategory: Dispatch<SetStateAction<CaseCategory>>;
  setSummary: Dispatch<SetStateAction<string>>;
  setSelectedProtectedPersonId: Dispatch<SetStateAction<string>>;
  cancelCaseCreateModal: CrudActions["cancelCaseCreateModal"];
  addCase: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  addAnonymousCase: CrudActions["addAnonymousCase"];
  isNoteModalOpen: boolean;
  editingNote: CaseNoteRecord | null;
  noteTitle: string;
  noteDate: string;
  noteType: CaseNoteType;
  participants: string;
  content: string;
  nextSteps: string;
  cases: CaseRecord[];
  linkedCaseIds: string[];
  confidentialLevel: ConfidentialLevel;
  containsHealthData: boolean;
  noteError: string;
  noteInfo: string;
  setNoteTitle: Dispatch<SetStateAction<string>>;
  setNoteDate: Dispatch<SetStateAction<string>>;
  setNoteType: Dispatch<SetStateAction<CaseNoteType>>;
  setParticipants: Dispatch<SetStateAction<string>>;
  setConfidentialLevel: Dispatch<SetStateAction<ConfidentialLevel>>;
  setContainsHealthData: Dispatch<SetStateAction<boolean>>;
  toggleLinkedCase: (caseId: string, checked: boolean) => void;
  cancelNoteModal: () => void;
  saveNote: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  caseProcessDraft: CaseProcessDraft | null;
  setCaseProcessDraft: Dispatch<SetStateAction<CaseProcessDraft | null>>;
  createCaseProcessFromDraft: ProcessCreationActions["createCaseProcessFromDraft"];
  contacts: ContactRecord[];
  processTemplateModal: ProcessTemplateModalState | null;
  setProcessTemplateModal: Dispatch<SetStateAction<ProcessTemplateModalState | null>>;
  renderAndDownloadProcessTemplate: TemplateActions["renderAndDownloadProcessTemplate"];
  legacyBindingCase: CaseRecord | null;
  legacyBindingError: string;
  openLegacyBindingDialog: (caseRecord: CaseRecord) => void;
  closeLegacyBindingDialog: () => void;
  assignLegacyCase: (protectedPersonId: string, reason: string) => Promise<void>;
  closedLegacyBulkCount: number;
  bulkMarkClosedLegacyCases: () => Promise<void>;
  onOpenExportHandover: () => void;
  onOpenImportHandover: () => void;
  onContinueExpiredHandover: () => Promise<void>;
  onOpenParticipationViolationPrefill: CasesViewProps["onOpenParticipationViolationPrefill"];
} & ProcessUpdateActions & Pick<TemplateActions, "openProcessTemplateModal"> & Pick<ProcessCreationActions, "openCaseProcessDraft"> & Pick<CrudActions, "deleteNote"> & Pick<NoteEditorActions, "startEditNote" | "openNewNoteModal">;

export function CasesViewRender(props: CasesViewRenderProps) {
  const { caseToast, visibleCases, selectedCaseId, filteredCases, caseFilter, setCaseFilter, normalizedCaseRegisterPage, caseRegisterPageCount, caseRegisterPageSize, setCaseRegisterPage, openCaseCreateModal, selectedCase, selectedNote, selectedDocument, selectedSearchResult, selectedPreventionProcess, selectedBemProcess, selectedTerminationProcess, selectedEqualizationProcess, selectedEqualizationNotes, selectedParticipationProcess, selectedWorkplaceAccommodationProcess, notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses, caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses, isCaseChildrenLoading, selection, setSelection, setSelectedCaseId, searchQuery, searchOnlySelectedCase, searchResults, searchError, searchInfo, isSearching, selectedSearchSourceTypes, runSearch, setSearchQuery, setSearchOnlySelectedCase, setSelectedSearchSourceTypes, documentActions, updateCasePreventionProcess, openProcessTemplateModal, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseEqualizationProcess, createEqualizationSecureNote, updateCaseParticipationProcess, openCaseProcessDraft, updateCaseWorkplaceAccommodationProcess, startEditNote, deleteNote, openNewNoteModal, inlineCommands, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, error, isCaseCreateModalOpen, setCaseNumber, setDisplayName, setCategory, setSummary, setSelectedProtectedPersonId, cancelCaseCreateModal, addCase, addAnonymousCase, isNoteModalOpen, editingNote, noteTitle, noteDate, noteType, participants, content, nextSteps, cases, linkedCaseIds, confidentialLevel, containsHealthData, noteError, noteInfo, setNoteTitle, setNoteDate, setNoteType, setParticipants, setConfidentialLevel, setContainsHealthData, toggleLinkedCase, cancelNoteModal, saveNote, caseProcessDraft, setCaseProcessDraft, createCaseProcessFromDraft, contacts, processTemplateModal, setProcessTemplateModal, renderAndDownloadProcessTemplate, legacyBindingCase, legacyBindingError, openLegacyBindingDialog, closeLegacyBindingDialog, assignLegacyCase, closedLegacyBulkCount, bulkMarkClosedLegacyCases, onOpenParticipationViolationPrefill } = props;

  function renderSearchExcerpt(result: CaseSearchResult) {
    const segments = result.excerptSegments?.length ? result.excerptSegments : [{ text: result.excerpt, match: false }];
    return segments.map((segment, index) => segment.match
      ? <mark key={`${segment.text}-${index}`}>{segment.text}</mark>
      : <span key={`${segment.text}-${index}`}>{segment.text}</span>);
  }

  function selectSearchResult(result: CaseSearchResult) {
    if (result.caseId && result.caseId !== selectedCaseId) setSelectedCaseId(result.caseId);
    const targetId = result.navigationId ?? result.sourceId;
    if (result.navigationKind === 'note') {
      setSelection({ type: 'note', id: targetId });
      return;
    }
    if (result.navigationKind === 'document') {
      setSelection({ type: 'document', id: targetId });
      return;
    }
    const processTypeBySource: Partial<Record<CaseSearchResult['sourceType'], CaseProcessType>> = {
      bem: 'bem',
      bem_event: 'bem',
      prevention: 'prevention',
      prevention_event: 'prevention',
      termination: 'termination_hearing',
      equalization: 'equalization',
      participation: 'participation',
      participation_event: 'participation',
      workplace_accommodation: 'workplace_accommodation',
    };
    const processType = processTypeBySource[result.sourceType];
    if (result.navigationKind === 'process' && processType) {
      setSelection({ type: 'process', processType, id: targetId });
      return;
    }
    setSelection({ type: 'search', id: `${result.sourceType}:${result.sourceId}` });
  }

  return (
    <>
      {caseToast && (
        <div
          className={`case-toast case-toast-${caseToast.variant}`}
          role="status"
          aria-live="assertive"
        >
          {caseToast.variant === "warning" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{caseToast.text}</span>
        </div>
      )}
      <ProcessTemplateDocumentsModal
        state={processTemplateModal}
        onClose={() => setProcessTemplateModal(null)}
        onDownload={(template) =>
          void renderAndDownloadProcessTemplate(template)
        }
        processTypeLabel={processTypeLabel}
      />
      <ModuleFrame
        title="Fälle"
        kicker="Fallakten"
        description="Fallakten, Notizen, Prozesse und Unterlagen bearbeiten."
        compact
      >
        <CaseRegister
          filteredCount={filteredCases.length}
          visibleCases={visibleCases}
          selectedCaseId={selectedCaseId}
          caseFilter={caseFilter}
          onCaseFilterChange={(value) => {
            setCaseFilter(value);
            setCaseRegisterPage(1);
          }}
          onSelectCase={setSelectedCaseId}
          onCreateCase={openCaseCreateModal}
          onImportHandover={props.onOpenImportHandover}
          onBulkMarkClosedLegacyCases={() => void bulkMarkClosedLegacyCases()}
          closedLegacyBulkCount={closedLegacyBulkCount}
          page={normalizedCaseRegisterPage}
          pageCount={caseRegisterPageCount}
          pageSize={caseRegisterPageSize}
          onPageChange={setCaseRegisterPage}
        />

        <section className="case-workbench">
        <CaseTreePanel
          selectedCase={selectedCase}
          notes={notes}
          documents={documents}
          preventionProcesses={casePreventionProcesses}
          bemProcesses={caseBemProcesses}
          equalizationProcesses={caseEqualizationProcesses}
          terminationProcesses={caseTerminationProcesses}
          participationProcesses={caseParticipationProcesses}
          workplaceAccommodationProcesses={caseWorkplaceAccommodationProcesses}
          isLoading={isCaseChildrenLoading}
          selection={selection}
          onSelect={setSelection}
          formatProcessNodeSubtitle={formatProcessNodeSubtitle}
          formatNoteDate={formatNoteDate}
          formatBytes={formatBytes}
        />

        <CaseDetailPanel
          searchQuery={searchQuery}
          searchOnlySelectedCase={searchOnlySelectedCase}
          searchResults={searchResults}
          searchError={searchError}
          searchInfo={searchInfo}
          isSearching={isSearching}
          selectedSearchSourceTypes={selectedSearchSourceTypes}
          onSearchSubmit={runSearch}
          onSearchQueryChange={setSearchQuery}
          onSearchOnlySelectedCaseChange={setSearchOnlySelectedCase}
          onSearchSourceTypesChange={setSelectedSearchSourceTypes}
          onSelectSearchResult={selectSearchResult}
          onExportHandover={props.onOpenExportHandover}
          canExportHandover={Boolean(selectedCase)}
        >
          {selection.type === "overview" && (
            <CaseOverviewDetail
              selectedCase={selectedCase}
              notesCount={notes.length}
              documentsCount={documents.length}
              legalReferencesCount={caseLegalReferences.length}
              processesCount={
                casePreventionProcesses.length +
                caseBemProcesses.length +
                caseEqualizationProcesses.length +
                caseTerminationProcesses.length +
                caseParticipationProcesses.length +
                caseWorkplaceAccommodationProcesses.length
              }
              onOpenLegacyBinding={selectedCase?.personBindingState === "legacy_unlinked" ? () => openLegacyBindingDialog(selectedCase) : undefined}
              onContinueExpiredHandover={props.onContinueExpiredHandover}
              contextualTemplateActions={
                selectedCase &&
                (() => {
                  const action = resolveContextualTemplateAction({
                    sourceType: "case",
                    title: "Fallübersicht",
                  });
                  return action ? (
                    <div className="contextual-template-actions">
                      <ContextualTemplateButton
                        action={action}
                        caseId={selectedCase.id}
                        values={{
                          "fall.aktenzeichen": selectedCase.caseNumber,
                          "fall.name": selectedCase.displayName,
                          "fall.kurzbeschreibung": selectedCase.summary ?? "",
                        }}
                      />
                    </div>
                  ) : null;
                })()
              }
            />
          )}

          {selection.type === "process" &&
            selection.processType === "prevention" && (
              <>
                <PreventionProcessDetail
                  processType={selection.processType}
                  process={selectedPreventionProcess}
                  onUpdate={updateCasePreventionProcess}
                  onOpenTemplates={openProcessTemplateModal}
                />
                {selectedPreventionProcess && selectedCase && (
                  <MeasureNotesPanel
                    caseId={selectedCase.id}
                    measureType="prevention"
                    measureId={selectedPreventionProcess.id}
                    measureTitle="Präventionsverfahren"
                  />
                )}
              </>
            )}

          {selection.type === "process" && selection.processType === "bem" && (
            <>
              <BemProcessDetail
                processType={selection.processType}
                process={selectedBemProcess}
                onUpdate={updateCaseBemProcess}
                onOpenTemplates={openProcessTemplateModal}
              />
              {selectedBemProcess && selectedCase && (
                <MeasureNotesPanel
                  caseId={selectedCase.id}
                  measureType="bem"
                  measureId={selectedBemProcess.id}
                  measureTitle={selectedBemProcess.title}
                />
              )}
            </>
          )}

          {selection.type === "process" &&
            selection.processType === "termination_hearing" &&
            selectedTerminationProcess && (
              <>
                <TerminationProcessDetail
                  process={selectedTerminationProcess}
                  onUpdate={updateCaseTerminationProcess}
                  onOpenTemplates={openProcessTemplateModal}
                />
                {selectedCase && (
                  <MeasureNotesPanel
                    caseId={selectedCase.id}
                    measureType="termination_hearing"
                    measureId={selectedTerminationProcess.id}
                    measureTitle="Kündigungsanhörung"
                  />
                )}
              </>
            )}

          {selection.type === "process" &&
            selection.processType === "equalization" &&
            selectedEqualizationProcess && (
              <>
                <EqualizationProcessDetail
                  process={selectedEqualizationProcess}
                  onUpdate={updateCaseEqualizationProcess}
                  onOpenTemplates={openProcessTemplateModal}
                  secureNotes={selectedEqualizationNotes}
                  onCreateSecureNote={createEqualizationSecureNote}
                />
                {selectedCase && (
                  <MeasureNotesPanel
                    caseId={selectedCase.id}
                    measureType="equalization"
                    measureId={selectedEqualizationProcess.id}
                    measureTitle="Gleichstellung / GdB"
                  />
                )}
              </>
            )}



          {selection.type === "process" &&
            selection.processType === "participation" &&
            selectedParticipationProcess && (
              <>
                <ParticipationProcessDetail
                  process={selectedParticipationProcess}
                  caseRecord={selectedCase}
                  onUpdate={updateCaseParticipationProcess}
                  onOpenViolationPrefill={onOpenParticipationViolationPrefill}
                />
                {selectedCase && (
                  <MeasureNotesPanel
                    caseId={selectedCase.id}
                    measureType="participation"
                    measureId={selectedParticipationProcess.id}
                    measureTitle={selectedParticipationProcess.title}
                  />
                )}
              </>
            )}

          {selection.type === "process" &&
            selection.processType === "workplace_accommodation" &&
            selectedWorkplaceAccommodationProcess && (
              <>
                <WorkplaceAccommodationProcessDetail
                  process={selectedWorkplaceAccommodationProcess}
                  onUpdate={updateCaseWorkplaceAccommodationProcess}
                />
                {selectedCase && (
                  <MeasureNotesPanel
                    caseId={selectedCase.id}
                    measureType="workplace_accommodation"
                    measureId={selectedWorkplaceAccommodationProcess.id}
                    measureTitle={selectedWorkplaceAccommodationProcess.title}
                  />
                )}
              </>
            )}

          {selectedNote && (
            <article className="case-detail-content">
              <div className="case-note-card-header">
                <span className="industrial-badge">
                  {selectedNote.noteType}
                </span>
                <time>{formatNoteDate(selectedNote.noteDate)}</time>
              </div>
              <h2>{selectedNote.title}</h2>
              {selectedNote.participants && (
                <p className="industrial-meta">
                  Beteiligte: {selectedNote.participants}
                </p>
              )}
              {!!selectedNote.caseNumbers?.length && (
                <p className="industrial-meta">
                  Fallbezüge: {selectedNote.caseNumbers.join(", ")}
                </p>
              )}
              <p className="case-note-content">{selectedNote.content}</p>
              <CaseNoteEntityLinks
                links={selectedNote.links}
                onSelect={setSelection}
              />
              {selectedNote.nextSteps && (
                <p className="case-note-next">
                  <strong>Nächste Schritte:</strong> {selectedNote.nextSteps}
                </p>
              )}
              <div className="industrial-card-actions">
                <button
                  type="button"
                  className="industrial-secondary-button"
                  onClick={() => startEditNote(selectedNote)}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="industrial-secondary-button"
                  onClick={() => void deleteNote(selectedNote)}
                >
                  <Trash2 className="h-4 w-4" /> Löschen
                </button>
              </div>
            </article>
          )}

          <CaseDocumentDetail
            document={selectedDocument}
            formatNoteDate={formatNoteDate}
            formatBytes={formatBytes}
            onOpen={(document) => void documentActions.openDocument(document)}
            onExport={(document) =>
              void documentActions.exportDocument(document)
            }
            onDelete={(document) =>
              void documentActions.deleteDocument(document)
            }
          />

          {selectedSearchResult && !selectedNote && !selectedDocument && (
            <article className="case-detail-content">
              <h2>{selectedSearchResult.title}</h2>
              <p>{renderSearchExcerpt(selectedSearchResult)}</p>
              <button
                type="button"
                className="industrial-secondary-button"
                onClick={() => setSelectedCaseId(selectedSearchResult.caseId)}
              >
                Fallakte öffnen
              </button>
            </article>
          )}

          <CaseWorkbenchFooter
            disabled={!selectedCaseId}
            onNewNote={openNewNoteModal}
            onImportDocument={() => void documentActions.importDocuments()}
            onDeadline={inlineCommands.openCaseDeadlineDraft}
            onProcess={openCaseProcessDraft}
          />
        </CaseDetailPanel>
        </section>
      </ModuleFrame>

      <CaseCreateModal
        open={isCaseCreateModalOpen}
        caseNumber={caseNumber}
        displayName={displayName}
        category={category}
        summary={summary}
        selectedProtectedPersonId={selectedProtectedPersonId}
        protectedPersons={protectedPersons}
        error={error}
        onCaseNumberChange={setCaseNumber}
        onDisplayNameChange={setDisplayName}
        onCategoryChange={setCategory}
        onSummaryChange={setSummary}
        onProtectedPersonChange={setSelectedProtectedPersonId}
        onCancel={cancelCaseCreateModal}
        onSubmit={addCase}
        onAnonymousSubmit={addAnonymousCase}
      />

      <LegacyCaseBindingDialog
        open={Boolean(legacyBindingCase)}
        legacyCase={legacyBindingCase ?? undefined}
        persons={protectedPersons}
        error={legacyBindingError}
        onClose={closeLegacyBindingDialog}
        onAssign={assignLegacyCase}
      />

      <CaseNoteModal
        open={isNoteModalOpen}
        editingNote={editingNote}
        noteTitle={noteTitle}
        noteDate={noteDate}
        noteType={noteType}
        participants={participants}
        content={content}
        nextSteps={nextSteps}
        cases={cases}
        linkedCaseIds={linkedCaseIds}
        selectedCaseId={selectedCaseId}
        confidentialLevel={confidentialLevel}
        containsHealthData={containsHealthData}
        noteError={noteError}
        noteInfo={noteInfo}
        onTitleChange={setNoteTitle}
        onDateChange={setNoteDate}
        onNoteTypeChange={setNoteType}
        onParticipantsChange={setParticipants}
        onProtocolTextChange={inlineCommands.handleProtocolTextChange}
        onProtocolTextCommand={inlineCommands.handleProtocolTextCommand}
        onToggleLinkedCase={toggleLinkedCase}
        onConfidentialLevelChange={setConfidentialLevel}
        onContainsHealthDataChange={setContainsHealthData}
        onCancel={cancelNoteModal}
        onSubmit={saveNote}
      />

      <CaseProcessDraftModal
        draft={caseProcessDraft}
        onChange={(nextDraft) => setCaseProcessDraft(nextDraft)}
        onCancel={() => setCaseProcessDraft(null)}
        onCreate={() => void createCaseProcessFromDraft()}
      />

      <InlineCommandOverlays
        cases={cases}
        contacts={contacts}
        selectedCase={selectedCase}
        {...inlineCommands.overlayProps}
      />
    </>
  );

}
