import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { CasesViewLayout } from "./CasesViewLayout";
import { CasesViewHeader } from "./CasesViewHeader";
import { CasesViewToolbar } from "./CasesViewToolbar";
import { CaseRegister } from "./CaseRegister";
import { CaseTreePanel } from "./CaseTreePanel";
import { CaseDetailPanel } from "./CaseDetailPanel";
import { CaseOverviewDetail } from "./CaseOverviewDetail";
import { CaseDocumentDetail } from "./CaseDocumentDetail";
import { CaseCreateModal } from "./CaseCreateModal";
import { CaseNoteModal } from "./CaseNoteModal";
import { CaseProcessDraftModal } from "./CaseProcessDraftModal";
import { CaseWorkbenchFooter } from "./CaseWorkbenchFooter";
import { InlineCommandOverlays } from "./InlineCommandOverlays";
import { ProcessTemplateDocumentsModal } from "./ProcessTemplateDocumentsModal";
import { ContextualTemplateButton } from "./ContextualTemplateButton";
import { CaseNoteEntityLinks } from "./CaseNoteEntityLinks";
import { PreventionProcessDetail } from "../prevention/PreventionProcessDetail";
import { BemProcessDetail } from "../bem/BemProcessDetail";
import { EqualizationProcessDetail } from "../equalization/EqualizationProcessDetail";
import { TerminationProcessDetail } from "../termination/TerminationProcessDetail";
import { ParticipationProcessDetail } from "../participation/ParticipationProcessDetail";
import { WorkplaceAccommodationProcessDetail } from "../workplace-accommodation/WorkplaceAccommodationProcessDetail";
import { resolveContextualTemplateAction } from "@services/templateContextPolicy";
import { formatBytes, formatCaseLabel, formatNoteDate, formatProcessNodeSubtitle, processTypeLabel } from "./caseWorkbenchFormat";

type CasesViewRenderProps = Record<string, any>;

export function CasesViewRender(props: CasesViewRenderProps) {
  const { caseToast, visibleCases, selectedCaseId, filteredCases, caseFilter, setCaseFilter, normalizedCaseRegisterPage, caseRegisterPageCount, caseRegisterPageSize, setCaseRegisterPage, openCaseCreateModal, selectedCase, selectedNote, selectedDocument, selectedSearchResult, selectedPreventionProcess, selectedBemProcess, selectedTerminationProcess, selectedEqualizationProcess, selectedEqualizationNotes, selectedParticipationProcess, selectedWorkplaceAccommodationProcess, notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses, caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses, selection, setSelection, setSelectedCaseId, searchQuery, searchOnlySelectedCase, searchResults, runSearch, setSearchQuery, setSearchOnlySelectedCase, documentActions, updateCasePreventionProcess, openProcessTemplateModal, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseEqualizationProcess, createEqualizationSecureNote, updateCaseParticipationProcess, openCaseProcessDraft, updateCaseWorkplaceAccommodationProcess, startEditNote, deleteNote, openNewNoteModal, inlineCommands, caseNumber, displayName, category, summary, error, isCaseCreateModalOpen, setCaseNumber, setDisplayName, setCategory, setSummary, cancelCaseCreateModal, addCase, isNoteModalOpen, editingNote, noteTitle, noteDate, noteType, participants, content, nextSteps, cases, linkedCaseIds, confidentialLevel, containsHealthData, noteError, noteInfo, setNoteTitle, setNoteDate, setNoteType, setParticipants, setConfidentialLevel, setContainsHealthData, toggleLinkedCase, cancelNoteModal, saveNote, caseProcessDraft, setCaseProcessDraft, createCaseProcessFromDraft, contacts, processTemplateModal, setProcessTemplateModal, renderAndDownloadProcessTemplate } = props;
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
          onSearchSubmit={runSearch}
          onSearchQueryChange={setSearchQuery}
          onSearchOnlySelectedCaseChange={setSearchOnlySelectedCase}
          onSelectSearchResult={(result) =>
            setSelection({ type: "search", id: result.sourceId })
          }
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
              <PreventionProcessDetail
                processType={selection.processType}
                process={selectedPreventionProcess}
                onUpdate={updateCasePreventionProcess}
                onOpenTemplates={openProcessTemplateModal}
              />
            )}

          {selection.type === "process" && selection.processType === "bem" && (
            <BemProcessDetail
              processType={selection.processType}
              process={selectedBemProcess}
              onUpdate={updateCaseBemProcess}
              onOpenTemplates={openProcessTemplateModal}
            />
          )}

          {selection.type === "process" &&
            selection.processType === "termination_hearing" &&
            selectedTerminationProcess && (
              <TerminationProcessDetail
                process={selectedTerminationProcess}
                onUpdate={updateCaseTerminationProcess}
                onOpenTemplates={openProcessTemplateModal}
              />
            )}

          {selection.type === "process" &&
            selection.processType === "equalization" &&
            selectedEqualizationProcess && (
              <EqualizationProcessDetail
                process={selectedEqualizationProcess}
                onUpdate={updateCaseEqualizationProcess}
                onOpenTemplates={openProcessTemplateModal}
                secureNotes={selectedEqualizationNotes}
                onCreateSecureNote={createEqualizationSecureNote}
              />
            )}



          {selection.type === "process" &&
            selection.processType === "participation" &&
            selectedParticipationProcess && (
              <ParticipationProcessDetail
                process={selectedParticipationProcess}
                onUpdate={updateCaseParticipationProcess}
              />
            )}

          {selection.type === "process" &&
            selection.processType === "workplace_accommodation" &&
            selectedWorkplaceAccommodationProcess && (
              <WorkplaceAccommodationProcessDetail
                process={selectedWorkplaceAccommodationProcess}
                onUpdate={updateCaseWorkplaceAccommodationProcess}
              />
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
              <p>{selectedSearchResult.excerpt}</p>
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

      <CaseCreateModal
        open={isCaseCreateModalOpen}
        caseNumber={caseNumber}
        displayName={displayName}
        category={category}
        summary={summary}
        error={error}
        onCaseNumberChange={setCaseNumber}
        onDisplayNameChange={setDisplayName}
        onCategoryChange={setCategory}
        onSummaryChange={setSummary}
        onCancel={cancelCaseCreateModal}
        onSubmit={addCase}
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
