import type { CaseRecord } from '../../../domain/models/case.model';
import type { GremiaBrDashboardOverview, GremiaBrExternalReferenceRecord, GremiaBrInformationRequest, GremiaBrProcedureDetail } from '../../../domain/models/gremia-br.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { GremiaBrInformationRequestComposer } from './GremiaBrInformationRequestComposer';
import { GremiaBrInformationRequestsTable } from './GremiaBrInformationRequestsTable';
import { GremiaBrProcedureTaskComposer } from './GremiaBrProcedureTaskComposer';
import { GremiaBrProcedureLinksTable, GremiaBrProcedureOwnTasks, GremiaBrProcedureSummary } from './GremiaBrProcedureReferenceViews';
import { GremiaBrProcedureSelection } from './GremiaBrProcedureSelection';

export function GremiaBrProcedureLinksPanel({
  cases, overview, localCaseId, remoteCaseId, procedureId, detail, links, informationRequests, informationRequestsProcedureId,
  requestItems, requestReason, responseDueDate, busy, disabled,
  taskTitle, taskDescription, taskDueDate,
  onLocalCaseChange, onRemoteCaseChange, onProcedureChange, onLoadDetail, onLoadInformationRequests, onCreateInformationRequest,
  onRequestItemsChange, onRequestReasonChange, onResponseDueDateChange, onLink, onUnlink,
  onCompleteInformationRequest,
  onTaskTitleChange, onTaskDescriptionChange, onTaskDueDateChange, onCreateTask,
  onOpenTask,
}: {
  cases: CaseRecord[];
  overview: GremiaBrDashboardOverview;
  localCaseId: string;
  remoteCaseId: string;
  procedureId: string;
  detail: GremiaBrProcedureDetail | null;
  links: GremiaBrExternalReferenceRecord[];
  informationRequests: GremiaBrInformationRequest[];
  informationRequestsProcedureId: string;
  requestItems: string;
  requestReason: string;
  responseDueDate: string;
  taskTitle: string;
  taskDescription: string;
  taskDueDate: string;
  busy: boolean;
  disabled: boolean;
  onLocalCaseChange: (id: string) => void;
  onRemoteCaseChange: (id: string) => void;
  onProcedureChange: (id: string) => void;
  onLoadDetail: () => void;
  onLoadInformationRequests: () => void;
  onCreateInformationRequest: () => void;
  onRequestItemsChange: (value: string) => void;
  onRequestReasonChange: (value: string) => void;
  onResponseDueDateChange: (value: string) => void;
  onCompleteInformationRequest: (id: string) => void;
  onTaskTitleChange: (value: string) => void;
  onTaskDescriptionChange: (value: string) => void;
  onTaskDueDateChange: (value: string) => void;
  onCreateTask: () => void;
  onOpenTask: (id: string) => void;
  onLink: () => void;
  onUnlink: (id: string) => void;
}) {
  const validDetail = detail?.id === procedureId && detail.masterCaseId === remoteCaseId ? detail : null;
  const procedureLinks = links.filter((link) => link.sourceType === 'verfahren');
  const alreadyLinked = procedureLinks.some((link) => link.sourceId === procedureId);
  const canInteract = !disabled && !busy;

  return (
    <IndustrialPanel kicker="Fallbezug" title="Verknüpfte Gremia.BR-Verfahren">
      <GremiaBrProcedureSelection
        cases={cases}
        remoteCases={overview.accessibleCases}
        localCaseId={localCaseId}
        remoteCaseId={remoteCaseId}
        procedureId={procedureId}
        disabled={!canInteract}
        remoteDisabled={!overview.lastFetchedAt}
        onLocalCaseChange={onLocalCaseChange}
        onRemoteCaseChange={onRemoteCaseChange}
        onProcedureChange={onProcedureChange}
      />
      {procedureId ? (
        <div className="industrial-action-row">
          <ToolbarButton disabled={!canInteract} onClick={onLoadDetail}>Verfahrensdetails laden</ToolbarButton>
        </div>
      ) : null}
      {validDetail ? (
        <>
          <GremiaBrProcedureSummary detail={validDetail} />
          <div className="industrial-action-row">
            <IndustrialButton disabled={!canInteract || !localCaseId || alreadyLinked} onClick={onLink}>
              {alreadyLinked ? 'Bereits verknüpft' : 'Mit Fallakte verknüpfen'}
            </IndustrialButton>
          </div>
        </>
      ) : null}
      {validDetail && alreadyLinked ? (
        <div className="industrial-action-row">
          <ToolbarButton disabled={!canInteract} onClick={onLoadInformationRequests}>Informationsanforderungen laden</ToolbarButton>
        </div>
      ) : null}
      {alreadyLinked && informationRequestsProcedureId === procedureId ? (
        <GremiaBrInformationRequestsTable requests={informationRequests} busy={busy || disabled} onComplete={onCompleteInformationRequest} />
      ) : null}
      {validDetail && alreadyLinked ? (
        <>
          <GremiaBrInformationRequestComposer
            items={requestItems}
            reason={requestReason}
            dueDate={responseDueDate}
            busy={busy}
            disabled={disabled}
            onItemsChange={onRequestItemsChange}
            onReasonChange={onRequestReasonChange}
            onDueDateChange={onResponseDueDateChange}
            onCreate={onCreateInformationRequest}
          />
          <GremiaBrProcedureOwnTasks procedureId={procedureId} tasks={overview.ownTasks} onOpenTask={onOpenTask} />
          <GremiaBrProcedureTaskComposer
            title={taskTitle}
            description={taskDescription}
            dueDate={taskDueDate}
            busy={busy}
            disabled={disabled}
            onTitleChange={onTaskTitleChange}
            onDescriptionChange={onTaskDescriptionChange}
            onDueDateChange={onTaskDueDateChange}
            onCreate={onCreateTask}
          />
        </>
      ) : null}
      {localCaseId ? (
        <GremiaBrProcedureLinksTable links={procedureLinks} busy={!canInteract} onUnlink={onUnlink} />
      ) : null}
    </IndustrialPanel>
  );
}
