import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import type { CaseRecord } from '../../core/models/case.model';
import type { PreventionProcessRecord, PreventionStatus } from '../../core/models/prevention.model';
import type { CaseNodeTarget } from '../../workflowViews';
import { formatDateShort, waitForBridge } from '../../workflowViews';
import { PREVENTION_OVERVIEW_STATUS_ORDER, isDonePreventionStatus, statusLabel } from './preventionShared';

type ProcessOverviewStatusGroup<TStatus extends string, TRecord> = {
  status: TStatus;
  label: string;
  records: TRecord[];
  collapsedByDefault?: boolean;
};

type ProcessOverviewCardModel<TStatus extends string> = {
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

function groupProcessOverviewRecords<TRecord, TStatus extends string>(
  records: TRecord[],
  statuses: TStatus[],
  getStatus: (record: TRecord) => TStatus,
  getLabel: (status: TStatus) => string,
  isDone: (status: TStatus) => boolean
): ProcessOverviewStatusGroup<TStatus, TRecord>[] {
  return statuses.map((status) => ({
    status,
    label: getLabel(status),
    records: records.filter((record) => getStatus(record) === status),
    collapsedByDefault: isDone(status)
  }));
}

function isIsoBeforeNow(iso?: string): boolean {
  if (!iso) return false;
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function ProcessOverviewCard<TStatus extends string>({
  item,
  onOpen
}: {
  item: ProcessOverviewCardModel<TStatus>;
  onOpen: (item: ProcessOverviewCardModel<TStatus>) => void;
}) {
  return (
    <button type="button" className="process-overview-card" onClick={() => onOpen(item)}>
      <div>
        <strong>{item.caseNumber}</strong>
        <span>{item.displayName}</span>
        <p>{item.summary}</p>
      </div>
      <div className="process-overview-card-meta">
        <span className="process-overview-badge">{item.statusLabel}</span>
        {item.riskLabel && <span className="process-overview-badge muted">{item.riskLabel}</span>}
        {item.dueLabel && <span className={`process-overview-badge ${item.isOverdue ? 'warning' : 'muted'}`}>Frist: {item.dueLabel}</span>}
        {item.updatedLabel && <small>geändert: {item.updatedLabel}</small>}
      </div>
    </button>
  );
}

function ProcessOverviewGroup<TStatus extends string>({
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
    <section className="process-overview-group">
      <button type="button" className="process-overview-group-header" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span>{open ? '▾' : '▸'}</span>
        <strong>{group.label}</strong>
        <em>{group.records.length}</em>
      </button>
      {open && (
        <div className="process-overview-group-body">
          {group.records.map(renderItem)}
          {!group.records.length && <div className="industrial-empty compact">{emptyText}</div>}
        </div>
      )}
    </section>
  );
}

function ProcessOverviewPage<TStatus extends string>({
  title,
  kicker,
  description,
  stats,
  groups,
  renderItem,
  emptyText
}: {
  title: string;
  kicker: string;
  description: string;
  stats: Array<{ label: string; value: number | string }>;
  groups: ProcessOverviewStatusGroup<TStatus, ProcessOverviewCardModel<TStatus>>[];
  renderItem: (item: ProcessOverviewCardModel<TStatus>) => ReactNode;
  emptyText: string;
}) {
  return (
    <ModuleFrame title={title} kicker={kicker} description={description}>
      <section className="industrial-panel process-overview-panel">
        <div className="process-overview-stats" aria-label="Kennzahlen">
          {stats.map((stat) => (
            <div key={stat.label} className="process-overview-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
        <div className="process-overview-groups">
          {groups.map((group) => (
            <ProcessOverviewGroup key={group.status} group={group} renderItem={renderItem} emptyText={emptyText} />
          ))}
        </div>
      </section>
    </ModuleFrame>
  );
}

function StepTooltip({ text }: { text: string }) {
  return (
    <span className="industrial-help-dot" title={text} aria-label={text}>
      <HelpCircle className="h-3.5 w-3.5" />
    </span>
  );
}

export function PreventionView({
  cases,
  onOpenCaseNode
}: {
  cases: CaseRecord[];
  onOpenCaseNode: (target: CaseNodeTarget) => void;
}) {
  const [processes, setProcesses] = useState<PreventionProcessRecord[]>([]);
  const [error, setError] = useState('');

  async function reload() {
    const bridge = await waitForBridge();
    if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
    const rows = await bridge.prevention.list();
    setProcesses(rows);
  }

  useEffect(() => {
    void reload().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Präventionsverfahren konnten nicht geladen werden.'));
  }, [cases.length]);

  const cards = useMemo<ProcessOverviewCardModel<PreventionStatus>[]>(() => processes.map((process) => {
    const record = cases.find((item) => item.id === process.caseId);
    return {
      id: process.id,
      caseId: process.caseId,
      caseNumber: record?.caseNumber ?? 'Fall nicht auflösbar',
      displayName: record?.displayName ?? 'unbekannte Fallakte',
      summary: process.hazardDescription || record?.summary || 'Keine Kurzbeschreibung hinterlegt.',
      status: process.status,
      statusLabel: statusLabel(process.status),
      riskLabel: process.riskType.replaceAll('_', ' '),
      dueLabel: formatDateShort(process.employerResponseDueAt),
      updatedLabel: formatDateShort(process.updatedAt),
      isOverdue: !isDonePreventionStatus(process.status) && isIsoBeforeNow(process.employerResponseDueAt)
    };
  }), [processes, cases]);

  const groups = useMemo(() => groupProcessOverviewRecords(
    cards,
    PREVENTION_OVERVIEW_STATUS_ORDER,
    (item) => item.status,
    statusLabel,
    isDonePreventionStatus
  ), [cards]);

  const openCount = cards.filter((item) => !isDonePreventionStatus(item.status)).length;
  const doneCount = cards.filter((item) => isDonePreventionStatus(item.status)).length;
  const overdueCount = cards.filter((item) => item.isOverdue).length;
  const highRiskCount = processes.filter((process) => ['kuendigung', 'chronifizierung', 'eskalation'].includes(process.riskType)).length;

  return (
    <>
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      <ProcessOverviewPage
        title="Präventionsverfahren"
        kicker="§ 167 Abs. 1 SGB IX"
        description="Übersicht über fallbezogene Präventionsverfahren. Die Bearbeitung erfolgt ausschließlich in der Fallakte."
        stats={[
          { label: 'offen', value: openCount },
          { label: 'überfällig', value: overdueCount },
          { label: 'hohes Risiko', value: highRiskCount },
          { label: 'erledigt', value: doneCount }
        ]}
        groups={groups}
        emptyText="Keine Verfahren in diesem Status."
        renderItem={(item) => (
          <ProcessOverviewCard
            key={item.id}
            item={item}
            onOpen={(target) => onOpenCaseNode({ caseId: target.caseId, nodeType: 'prevention', nodeId: target.id })}
          />
        )}
      />
    </>
  );
}

