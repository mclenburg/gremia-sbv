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

type CasesViewRenderProps = Record<string, any>;

export function CasesViewRender(props: CasesViewRenderProps) {
  const { caseToast, visibleCases, selectedCaseId, filteredCases, caseFilter, setCaseFilter, normalizedCaseRegisterPage, caseRegisterPageCount, caseRegisterPageSize, setCaseRegisterPage, openCaseCreateModal, selectedCase, selectedNote, selectedDocument, selectedSearchResult, selectedPreventionProcess, selectedBemProcess, selectedTerminationProcess, selectedEqualizationProcess, selectedEqualizationNotes, selectedParticipationProcess, selectedWorkplaceAccommodationProcess, notes, documents, caseLegalReferences, casePreventionProcesses, caseBemProcesses, caseEqualizationProcesses, caseTerminationProcesses, caseParticipationProcesses, caseWorkplaceAccommodationProcesses, isCaseChildrenLoading, selection, setSelection, setSelectedCaseId, searchQuery, searchOnlySelectedCase, searchResults, searchError, searchInfo, isSearching, selectedSearchSourceTypes, runSearch, setSearchQuery, setSearchOnlySelectedCase, setSelectedSearchSourceTypes, documentActions, updateCasePreventionProcess, openProcessTemplateModal, updateCaseBemProcess, updateCaseTerminationProcess, updateCaseEqualizationProcess, createEqualizationSecureNote, updateCaseParticipationProcess, openCaseProcessDraft, updateCaseWorkplaceAccommodationProcess, startEditNote, deleteNote, openNewNoteModal, inlineCommands, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, error, isCaseCreateModalOpen, setCaseNumber, setDisplayName, setCategory, setSummary, setSelectedProtectedPersonId, cancelCaseCreateModal, addCase, addAnonymousCase, isNoteModalOpen, editingNote, noteTitle, noteDate, noteType, participants, content, nextSteps, cases, linkedCaseIds, confidentialLevel, containsHealthData, noteError, noteInfo, setNoteTitle, setNoteDate, setNoteType, setParticipants, setConfidentialLevel, setContainsHealthData, toggleLinkedCase, cancelNoteModal, saveNote, caseProcessDraft, setCaseProcessDraft, createCaseProcessFromDraft, contacts, processTemplateModal, setProcessTemplateModal, renderAndDownloadProcessTemplate, legacyBindingCase, legacyBindingError, openLegacyBindingDialog, closeLegacyBindingDialog, assignLegacyCase, closedLegacyBulkCount, bulkMarkClosedLegacyCases } = props;

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
                  onUpdate={updateCaseParticipationProcess}
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
