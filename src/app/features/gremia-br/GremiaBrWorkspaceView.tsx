import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import {
  busyMatches,
  DisabledGremiaBrWorkspace,
  GremiaBrAgendaPanel,
  GremiaBrCacheTables,
  GremiaBrCaseSummaryPanel,
  GremiaBrConfigurationCard,
  GremiaBrDocumentTransferPanel,
  GremiaBrMeetingImportPanel,
  GremiaBrReadContextPanel,
  GremiaBrSummary,
  GremiaBrWorkspaceFeedback,
  GremiaBrWorkspaceHeader,
  isGremiaBrActionDisabled,
} from "./GremiaBrWorkspacePanels";
import { useGremiaBrWorkspace } from "./useGremiaBrWorkspace";

export function GremiaBrWorkspaceView() {
  const announce = useAnnouncer();
  const workspace = useGremiaBrWorkspace(announce);
  const actionDisabled = isGremiaBrActionDisabled(workspace.settings);

  if (!workspace.settings.enabled) {
    return <DisabledGremiaBrWorkspace />;
  }

  return (
    <section className="feature-stack" aria-labelledby="gremia-br-workspace-title">
      <GremiaBrWorkspaceHeader />
      <GremiaBrWorkspaceFeedback error={workspace.error} status={workspace.status} />
      <GremiaBrConfigurationCard settings={workspace.settings} />
      <GremiaBrSummary settings={workspace.settings} overview={workspace.overview} />
      <GremiaBrReadContextPanel
        busy={busyMatches(workspace.busyAction, "read")}
        onRefresh={() => void workspace.refreshReadContext()}
      />
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
      <GremiaBrCacheTables overview={workspace.overview} />
    </section>
  );
}
