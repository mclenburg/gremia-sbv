import { useState } from 'react';
import type { ReactNode } from 'react';
import { ModuleFeedback, type ModuleFeedbackItem } from '../components/ModuleFeedback';
import { ToolbarButton } from '../components/IndustrialButton';
import { EmptyState, IndustrialPanel, IndustrialSelectionCard, WorkbenchPage, WorkbenchSummary } from '../components/WorkbenchLayout';
import { ProcessStatusBadge } from '../components/StatusBadges';

export type ProcessOverviewStatusGroup<TStatus extends string, TRecord> = {
  status: TStatus;
  label: string;
  records: TRecord[];
  collapsedByDefault: boolean;
};

export type ProcessOverviewCardModel<TStatus extends string> = {
  id: string;
  caseId: string;
  caseNumber: string;
  displayName: string;
  summary: string;
  status: TStatus;
  statusLabel: string;
  riskLabel?: string;
  dueLabel?: string;
  updatedLabel?: string;
  isOverdue?: boolean;
};

export function groupProcessOverviewRecords<TRecord, TStatus extends string>(
  records: TRecord[],
  statuses: TStatus[],
  getStatus: (record: TRecord) => TStatus,
  getLabel: (status: TStatus) => string,
  isDone: (status: TStatus) => boolean,
  options: { keepNextEmptyActiveGroup?: boolean } = {}
): ProcessOverviewStatusGroup<TStatus, TRecord>[] {
  const grouped = statuses.map((status) => {
    const statusRecords = records.filter((record) => getStatus(record) === status);
    return {
      status,
      label: getLabel(status),
      records: statusRecords,
      collapsedByDefault: isDone(status) || statusRecords.length === 0
    };
  });

  if (!options.keepNextEmptyActiveGroup) return grouped;

  const activeGroups = grouped.filter((group) => !isDone(group.status) && group.records.length > 0);
  const nextEmptyGroup = grouped.find((group) => !isDone(group.status) && group.records.length === 0);
  const doneGroups = grouped.filter((group) => isDone(group.status) && group.records.length > 0);

  return [...activeGroups, ...(nextEmptyGroup ? [nextEmptyGroup] : []), ...doneGroups];
}

export function isIsoBeforeNow(iso?: string): boolean {
  if (!iso) return false;
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

export function ProcessOverviewCard<TStatus extends string>({
  item,
  onOpen
}: {
  item: ProcessOverviewCardModel<TStatus>;
  onOpen: (item: ProcessOverviewCardModel<TStatus>) => void;
}) {
  return (
    <ToolbarButton
      className={`process-overview-card ${item.isOverdue ? 'is-critical' : ''}`}
      onClick={() => onOpen(item)}
    >
      <IndustrialSelectionCard tone={item.isOverdue ? 'danger' : 'default'}>
        <div>
          <strong>{item.caseNumber}</strong>
          <span>{item.displayName}</span>
          <p>{item.summary}</p>
        </div>
        <div className="process-overview-card-meta">
          <ProcessStatusBadge status={item.statusLabel} label={item.statusLabel} />
          {item.riskLabel && <ProcessStatusBadge status="info" label={item.riskLabel} />}
          {item.dueLabel && <ProcessStatusBadge status={item.isOverdue ? 'overdue' : 'open'} label={`Frist: ${item.dueLabel}`} />}
          {item.updatedLabel && <small>geändert: {item.updatedLabel}</small>}
        </div>
      </IndustrialSelectionCard>
    </ToolbarButton>
  );
}

export function ProcessOverviewGroup<TStatus extends string>({
  group,
  renderItem,
  emptyText
}: {
  group: ProcessOverviewStatusGroup<TStatus, ProcessOverviewCardModel<TStatus>>;
  renderItem: (item: ProcessOverviewCardModel<TStatus>) => ReactNode;
  emptyText: string;
}) {
  const [open, setOpen] = useState(!group.collapsedByDefault);
  return (
    <section className={`process-overview-group ${group.records.length === 0 ? 'is-empty' : ''}`}>
      <ToolbarButton className="process-overview-group-header" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span>{open ? '▾' : '▸'}</span>
        <strong>{group.label}</strong>
        <em>{group.records.length}</em>
      </ToolbarButton>
      {open && (
        <div className="process-overview-group-body">
          {group.records.length > 0 ? group.records.map(renderItem) : <EmptyState title="Keine Einträge" text={emptyText} />}
        </div>
      )}
    </section>
  );
}

export function ProcessOverviewPage<TStatus extends string>({
  title,
  kicker,
  description,
  stats,
  groups,
  renderItem,
  emptyText,
  helpAction,
  feedbackItems = [],
  children
}: {
  title: string;
  kicker: string;
  description: string;
  stats: Array<{ label: string; value: number | string }>;
  groups: ProcessOverviewStatusGroup<TStatus, ProcessOverviewCardModel<TStatus>>[];
  renderItem: (item: ProcessOverviewCardModel<TStatus>) => ReactNode;
  emptyText: string;
  helpAction?: ReactNode;
  feedbackItems?: Array<ModuleFeedbackItem | null | undefined | false>;
  children?: ReactNode;
}) {
  return (
    <WorkbenchPage title={title} kicker={kicker} description={description}>
      <ModuleFeedback items={feedbackItems} />
      <IndustrialPanel className="process-overview-panel">
        {helpAction && (
          <div className="process-overview-topline process-overview-topline-actions">
            <span aria-hidden="true" />
            {helpAction}
          </div>
        )}
        <WorkbenchSummary items={stats.map((stat) => ({ label: stat.label, value: stat.value }))} ariaLabel="Kennzahlen" />
        {children}
        <div className="process-overview-groups">
          {groups.map((group) => (
            <ProcessOverviewGroup key={group.status} group={group} renderItem={renderItem} emptyText={emptyText} />
          ))}
        </div>
      </IndustrialPanel>
    </WorkbenchPage>
  );
}
