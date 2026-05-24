import { CheckCircle2, Edit3 } from 'lucide-react';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import {
  DataTable,
  EmptyState,
  IndustrialPanel,
  type DataTableRow
} from '../../shared/components/WorkbenchLayout';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseMeasureRecord } from '../../core/models/case-measure.model';
import { caseMeasureTypeLabels } from '../../core/models/case-measure.model';
import type { DeadlineRecord } from '../../core/models/deadline.model';
import { getDashboardState, getHoursRemaining } from '../../core/deadlineLogic';
import { DeadlineSeverityBadge, DeadlineStateBadge } from './DeadlineBadge';

function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function formatCase(deadline: DeadlineRecord, casesById: Map<string, CaseRecord>): string {
  if (deadline.caseId) {
    const linkedCase = casesById.get(deadline.caseId);
    return linkedCase?.caseNumber ?? 'nicht auflösbar';
  }

  return deadline.processType === 'custom' && deadline.deadlineType === 'follow_up'
    ? 'Freie Wiedervorlage'
    : 'Fallzuordnung fehlt';
}

function formatMeasure(deadline: DeadlineRecord, measuresById: Map<string, CaseMeasureRecord>): string {
  if (!deadline.measureId) return '—';
  const measure = measuresById.get(deadline.measureId);
  if (!measure) return 'Maßnahme nicht auflösbar';
  return `${caseMeasureTypeLabels[measure.type]} · ${measure.title}`;
}

export function DeadlineListView({
  deadlines,
  onEdit,
  onComplete,
  cases = [],
  measures = []
}: {
  deadlines: DeadlineRecord[];
  onEdit?: (deadline: DeadlineRecord) => void;
  onComplete?: (deadline: DeadlineRecord) => void;
  cases?: CaseRecord[];
  measures?: CaseMeasureRecord[];
}) {
  const casesById = new Map(cases.map((item) => [item.id, item]));
  const measuresById = new Map(measures.map((item) => [item.id, item]));

  const rows: DataTableRow[] = deadlines.map((deadline) => {
    const hours = getHoursRemaining(deadline.dueAt);
    const state = getDashboardState(deadline);

    return {
      id: deadline.id,
      cells: [
        <DeadlineStateBadge state={state} />,
        <>
          <p className="industrial-table-primary">{deadline.title}</p>
          <p className="industrial-table-secondary">{deadline.deadlineType} · {deadline.processType}</p>
        </>,
        formatCase(deadline, casesById),
        formatMeasure(deadline, measuresById),
        formatDueDate(deadline.dueAt),
        hours < 0 ? 'überfällig' : `${Math.round(hours)} h`,
        <DeadlineSeverityBadge severity={deadline.severity} />,
        <div className="industrial-table-actions">
          <ToolbarButton onClick={() => onEdit?.(deadline)}>
            <Edit3 className="h-4 w-4" /> Bearbeiten
          </ToolbarButton>
          <ToolbarButton onClick={() => onComplete?.(deadline)}>
            <CheckCircle2 className="h-4 w-4" /> Erledigt
          </ToolbarButton>
        </div>
      ]
    };
  });

  return (
    <IndustrialPanel
      kicker="Fristenregister"
      title="Alle offenen Fristen"
      description="Rechtliche Fristen und Workflow-Schritte brauchen einen Fallbezug. Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig."
    >
      <DataTable
        headers={['Status', 'Frist', 'Fall', 'Maßnahme', 'Fällig', 'Restzeit', 'Schwere', 'Aktion']}
        rows={rows}
        ariaLabel="Alle offenen Fristen"
        empty={<EmptyState title="Keine offenen Fristen" text="Keine offenen Fristen vorhanden." />}
      />
    </IndustrialPanel>
  );
}
