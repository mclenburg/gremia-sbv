import { useState } from 'react';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import {
  busyMatches,
  DisabledGremiaBrWorkspace,
  GremiaBrReadContextPanel,
  GremiaBrWorkspaceFeedback,
  GremiaBrWorkspaceHeader,
} from './GremiaBrWorkspacePanels';
import { GremiaBrTaskDetailDialog } from './GremiaBrTaskDetailDialog';
import {
  GREMIA_BR_WORKSPACE_SECTIONS,
  GremiaBrWorkspaceNavigation,
  type GremiaBrWorkspaceSection,
} from './GremiaBrWorkspaceNavigation';
import { GremiaBrWorkspaceSectionContent } from './GremiaBrWorkspaceSections';
import { useGremiaBrWorkspace } from './useGremiaBrWorkspace';

export function GremiaBrWorkspaceView() {
  const announce = useAnnouncer();
  const workspace = useGremiaBrWorkspace(announce);
  const [activeSection, setActiveSection] = useState<GremiaBrWorkspaceSection>('overview');
  const selectedTaskId = workspace.selectedTaskId;
  if (!workspace.settings.enabled) return <DisabledGremiaBrWorkspace />;

  return (
    <section className="feature-stack" aria-labelledby="gremia-br-workspace-title">
      <GremiaBrWorkspaceHeader />
      <GremiaBrWorkspaceFeedback error={workspace.error} status={workspace.status} />
      <GremiaBrReadContextPanel
        busy={busyMatches(workspace.busyAction, 'read')}
        onRefresh={() => void workspace.refreshReadContext()}
        lastFetchedAt={workspace.overview.lastFetchedAt}
      />
      <GremiaBrWorkspaceNavigation activeSection={activeSection} onSelect={setActiveSection} />
      {GREMIA_BR_WORKSPACE_SECTIONS.map((section) => (
        <div
          key={section.id}
          id={`gremia-br-${section.id}-panel`}
          role="tabpanel"
          aria-labelledby={`gremia-br-${section.id}-tab`}
          tabIndex={0}
          hidden={activeSection !== section.id}
          className="settings-hub-panel"
        >
          {activeSection === section.id ? (
            <div className="feature-stack"><GremiaBrWorkspaceSectionContent section={section.id} workspace={workspace} /></div>
          ) : null}
        </div>
      ))}
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
    </section>
  );
}
