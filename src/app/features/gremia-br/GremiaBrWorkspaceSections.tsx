import {
  busyMatches,
  GremiaBrAccessApprovalsPanel,
  GremiaBrAgendaPanel,
  GremiaBrCacheTables,
  GremiaBrCaseSummaryPanel,
  GremiaBrConfigurationCard,
  GremiaBrDocumentTransferPanel,
  GremiaBrMeetingImportPanel,
  GremiaBrOpenActionsPanel,
  GremiaBrSummary,
  GremiaBrWorkspaceActionHistory,
  isGremiaBrActionDisabled,
} from './GremiaBrWorkspacePanels';
import { GremiaBrCaseCreationPanel } from './GremiaBrCaseCreationPanel';
import { GremiaBrDocumentBrowsePanel } from './GremiaBrDocumentBrowsePanel';
import { GremiaBrMeetingAccessPanel } from './GremiaBrMeetingAccessPanel';
import { GremiaBrOwnSharesPanel } from './GremiaBrOwnSharesPanel';
import { GremiaBrProcedureLinksPanel } from './GremiaBrProcedureLinksPanel';
import type { GremiaBrWorkspaceSection } from './GremiaBrWorkspaceNavigation';
import type { useGremiaBrWorkspace } from './useGremiaBrWorkspace';

type Workspace = ReturnType<typeof useGremiaBrWorkspace>;

function OverviewSection({ workspace }: { workspace: Workspace }) {
  return <>
    <GremiaBrConfigurationCard settings={workspace.settings} />
    <GremiaBrSummary settings={workspace.settings} overview={workspace.overview} />
    <GremiaBrOpenActionsPanel overview={workspace.overview} onOpenTask={(id) => void workspace.openTaskDetail(id)} />
    <GremiaBrAccessApprovalsPanel approvals={workspace.overview.ownAccessApprovals} />
    <GremiaBrWorkspaceActionHistory actions={workspace.actions} />
    <GremiaBrCacheTables overview={workspace.overview} />
  </>;
}

function MeetingsSection({ workspace }: { workspace: Workspace }) {
  const disabled = isGremiaBrActionDisabled(workspace.settings);
  return <>
    <GremiaBrMeetingAccessPanel key={`meeting-${workspace.snapshotRevision}`} overview={workspace.overview} />
    <div className="industrial-grid-two">
      <GremiaBrAgendaPanel
        overview={workspace.overview}
        draft={workspace.draft}
        busy={busyMatches(workspace.busyAction, 'agenda')}
        disabled={disabled}
        onChange={workspace.updateDraft}
        onRequest={() => void workspace.requestAgendaItem()}
      />
      <GremiaBrMeetingImportPanel
        meetings={workspace.meetingDrafts}
        draft={workspace.draft}
        busy={busyMatches(workspace.busyAction, 'import')}
        disabled={disabled}
        onChange={workspace.updateDraft}
        onImport={() => void workspace.importMeeting()}
      />
    </div>
  </>;
}

function ProceduresSection({ workspace }: { workspace: Workspace }) {
  const disabled = isGremiaBrActionDisabled(workspace.settings);
  return <>
    <GremiaBrCaseCreationPanel cases={workspace.cases} settings={workspace.settings} />
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
      disabled={disabled}
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
    <GremiaBrCaseSummaryPanel
      cases={workspace.cases}
      draft={workspace.draft}
      busy={busyMatches(workspace.busyAction, 'summary')}
      disabled={disabled}
      onChange={workspace.updateDraft}
      onCreate={() => void workspace.createCaseSummary()}
    />
  </>;
}

function DocumentsSection({ workspace }: { workspace: Workspace }) {
  return <>
    <GremiaBrDocumentBrowsePanel key={`document-${workspace.snapshotRevision}`} cases={workspace.cases} />
    <GremiaBrOwnSharesPanel key={`shares-${workspace.snapshotRevision}`} actions={workspace.actions} />
    <GremiaBrDocumentTransferPanel
      documents={workspace.documents}
      draft={workspace.draft}
      busy={busyMatches(workspace.busyAction, 'transfer')}
      disabled={isGremiaBrActionDisabled(workspace.settings)}
      onChange={workspace.updateDraft}
      onRefreshDocuments={() => void workspace.refreshDocuments()}
      onTransfer={() => void workspace.transferDocument()}
    />
  </>;
}

export function GremiaBrWorkspaceSectionContent({ section, workspace }: {
  section: GremiaBrWorkspaceSection;
  workspace: Workspace;
}) {
  switch (section) {
    case 'overview': return <OverviewSection workspace={workspace} />;
    case 'meetings': return <MeetingsSection workspace={workspace} />;
    case 'procedures': return <ProceduresSection workspace={workspace} />;
    case 'documents': return <DocumentsSection workspace={workspace} />;
  }
}
