import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import {
  busyMatches,
  DisabledGremiaBrWorkspace,
  GremiaBrAccessApprovalsPanel,
  GremiaBrAgendaPanel,
  GremiaBrCacheTables,
  GremiaBrCaseSummaryPanel,
  GremiaBrConfigurationCard,
  GremiaBrDocumentTransferPanel,
  GremiaBrMeetingImportPanel,
  GremiaBrOpenActionsPanel,
  GremiaBrReadContextPanel,
  GremiaBrSummary,
  GremiaBrWorkspaceFeedback,
  GremiaBrWorkspaceHeader,
  GremiaBrWorkspaceActionHistory,
  isGremiaBrActionDisabled,
} from "./GremiaBrWorkspacePanels";
import { GremiaBrTaskDetailDialog } from './GremiaBrTaskDetailDialog';
import { GremiaBrProcedureLinksPanel } from './GremiaBrProcedureLinksPanel';
import { GremiaBrMeetingAccessPanel } from './GremiaBrMeetingAccessPanel';
import { GremiaBrDocumentBrowsePanel } from './GremiaBrDocumentBrowsePanel';
import { GremiaBrOwnSharesPanel } from './GremiaBrOwnSharesPanel';
import { GremiaBrCaseCreationPanel } from './GremiaBrCaseCreationPanel';
import { useGremiaBrWorkspace } from "./useGremiaBrWorkspace";

export function GremiaBrWorkspaceView() {
  const announce = useAnnouncer();
  const workspace = useGremiaBrWorkspace(announce);
  const selectedTaskId = workspace.selectedTaskId;
  const actionDisabled = isGremiaBrActionDisabled(workspace.settings);
  if (!workspace.settings.enabled) return <DisabledGremiaBrWorkspace />;

  return (
    <section className="feature-stack" aria-labelledby="gremia-br-workspace-title">
      <GremiaBrWorkspaceHeader />
      <GremiaBrWorkspaceFeedback error={workspace.error} status={workspace.status} />
      <GremiaBrConfigurationCard settings={workspace.settings} />
      <GremiaBrSummary settings={workspace.settings} overview={workspace.overview} />
      <GremiaBrReadContextPanel
        busy={busyMatches(workspace.busyAction, "read")}
        onRefresh={() => void workspace.refreshReadContext()}
        lastFetchedAt={workspace.overview.lastFetchedAt}
      />
      <GremiaBrOpenActionsPanel overview={workspace.overview} onOpenTask={(id) => void workspace.openTaskDetail(id)} />
      {workspace.settings.apiMode === 'gremia_br_v2' ? <GremiaBrAccessApprovalsPanel approvals={workspace.overview.ownAccessApprovals} /> : null}
      {workspace.settings.apiMode === 'gremia_br_v2' ? <GremiaBrMeetingAccessPanel key={`meeting-${workspace.snapshotRevision}`} overview={workspace.overview} /> : null}
      {workspace.settings.apiMode === 'gremia_br_v2' ? <GremiaBrDocumentBrowsePanel key={`document-${workspace.snapshotRevision}`} cases={workspace.cases} /> : null}
      {workspace.settings.apiMode === 'gremia_br_v2' ? <GremiaBrOwnSharesPanel key={`shares-${workspace.snapshotRevision}`} actions={workspace.actions} /> : null}
      {workspace.settings.apiMode === 'gremia_br_v2' ? <GremiaBrCaseCreationPanel cases={workspace.cases} settings={workspace.settings} /> : null}
      {workspace.settings.apiMode === 'gremia_br_v2' ? (
        <GremiaBrProcedureLinksPanel
          cases={workspace.cases}
          overview={workspace.overview}
          localCaseId={workspace.procedureLocalCaseId}
          remoteCaseId={workspace.procedureRemoteCaseId}
          procedureId={workspace.procedureId}
          detail={workspace.procedureDetail}
          links={workspace.procedureLinks}
          informationRequests={workspace.informationRequests}
          informationRequestsProcedureId={workspace.informationRequestsProcedureId}
          requestItems={workspace.requestItems}
          requestReason={workspace.requestReason}
          responseDueDate={workspace.responseDueDate}
          taskTitle={workspace.taskTitle}
          taskDescription={workspace.taskDescription}
          taskDueDate={workspace.taskDueDate}
          busy={busyMatches(workspace.busyAction, 'procedure')}
          disabled={actionDisabled}
          onLocalCaseChange={workspace.selectProcedureLocalCase}
          onRemoteCaseChange={workspace.selectProcedureRemoteCase}
          onProcedureChange={workspace.selectProcedure}
          onLoadDetail={() => void workspace.loadSelectedProcedure()}
          onLoadInformationRequests={() => void workspace.loadSelectedInformationRequests()}
          onCreateInformationRequest={() => void workspace.createSelectedInformationRequest()}
          onRequestItemsChange={workspace.setRequestItems}
          onRequestReasonChange={workspace.setRequestReason}
          onResponseDueDateChange={workspace.setResponseDueDate}
          onCompleteInformationRequest={(id) => void workspace.completeSelectedInformationRequest(id)}
          onTaskTitleChange={workspace.setTaskTitle}
          onTaskDescriptionChange={workspace.setTaskDescription}
          onTaskDueDateChange={workspace.setTaskDueDate}
          onCreateTask={() => void workspace.createSelectedProcedureTask()}
          onOpenTask={(id) => void workspace.openTaskDetail(id)}
          onLink={() => void workspace.linkSelectedProcedure()}
          onUnlink={(id) => void workspace.unlinkProcedure(id)}
        />
      ) : null}
      {selectedTaskId ? (
        <GremiaBrTaskDetailDialog
          title={workspace.overview.ownTasks.find((task) => task.id === selectedTaskId)?.title ?? 'Aufgabendetails'}
          detail={workspace.taskDetail}
          busy={workspace.taskDetailBusy}
          error={workspace.taskDetailError}
          status={workspace.taskDetailStatus}
          transitionOptions={workspace.transitionOptions}
          selectedTransition={workspace.selectedTransition}
          optionsBusy={workspace.optionsBusy}
          transitionBusy={workspace.transitionBusy}
          onLoadTransitions={() => void workspace.loadTransitions()}
          onSelectTransition={workspace.setSelectedTransition}
          onSubmitTransition={() => void workspace.submitTransition()}
          onReloadDetail={() => void workspace.openTaskDetail(selectedTaskId)}
          onClose={workspace.closeTaskDetail}
        />
      ) : null}
      <div className="industrial-grid-two">
        <GremiaBrCaseSummaryPanel
          cases={workspace.cases}
          draft={workspace.draft}
          busy={busyMatches(workspace.busyAction, "summary")}
          disabled={actionDisabled}
          onChange={workspace.updateDraft}
          onCreate={() => void workspace.createCaseSummary()}
        />
        <GremiaBrDocumentTransferPanel
          documents={workspace.documents}
          draft={workspace.draft}
          busy={busyMatches(workspace.busyAction, "transfer")}
          disabled={actionDisabled}
          onChange={workspace.updateDraft}
          onRefreshDocuments={() => void workspace.refreshDocuments()}
          onTransfer={() => void workspace.transferDocument()}
        />
        <GremiaBrAgendaPanel
          overview={workspace.overview}
          draft={workspace.draft}
          busy={busyMatches(workspace.busyAction, "agenda")}
          disabled={actionDisabled}
          onChange={workspace.updateDraft}
          onRequest={() => void workspace.requestAgendaItem()}
        />
        <GremiaBrMeetingImportPanel
          meetings={workspace.meetingDrafts}
          draft={workspace.draft}
          busy={busyMatches(workspace.busyAction, "import")}
          disabled={actionDisabled}
          onChange={workspace.updateDraft}
          onImport={() => void workspace.importMeeting()}
        />
      </div>
      <GremiaBrWorkspaceActionHistory actions={workspace.actions} />
      <GremiaBrCacheTables overview={workspace.overview} />
    </section>
  );
}
