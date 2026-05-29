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
import { deadlineProcessTypeLabels, deadlineTypeLabels } from './deadlineLabels';

function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function formatReference(deadline: DeadlineRecord, casesById: Map<string, CaseRecord>, measuresById: Map<string, CaseMeasureRecord>): string {
  const processLabel = deadlineProcessTypeLabels[deadline.processType];
  const linkedCase = deadline.caseId ? casesById.get(deadline.caseId) : undefined;
  const caseLabel = deadline.caseId ? linkedCase?.caseNumber ?? 'Fall nicht auflösbar' : undefined;

  if (deadline.measureId) {
    const measure = measuresById.get(deadline.measureId);
    const measureLabel = measure ? `${caseMeasureTypeLabels[measure.type]} · ${measure.title}` : 'Maßnahme nicht auflösbar';
    return caseLabel ? `${caseLabel} · ${measureLabel}` : measureLabel;
  }

  if (caseLabel) return `${caseLabel} · ${processLabel}`;

  return deadline.processType === 'custom' && deadline.deadlineType === 'follow_up'
    ? 'Freie Wiedervorlage ohne Fallbezug'
    : 'Fallzuordnung fehlt';
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
          <p className="industrial-table-secondary">{deadlineTypeLabels[deadline.deadlineType]} · {deadlineProcessTypeLabels[deadline.processType]}</p>
        </>,
        formatReference(deadline, casesById, measuresById),
        formatDueDate(deadline.dueAt),
        hours < 0 ? 'überfällig' : `${Math.round(hours)} h`,
        <DeadlineSeverityBadge severity={deadline.severity} />,
        <div className="industrial-table-actions">
          <ToolbarButton onClick={() => onEdit?.(deadline)}>
            <Edit3 className="h-4 w-4" aria-hidden="true" /> Bearbeiten
          </ToolbarButton>
          <ToolbarButton onClick={() => onComplete?.(deadline)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Erledigt
          </ToolbarButton>
        </div>
      ]
    };
  });

  return (
    <IndustrialPanel
      kicker="Fristenregister"
      title="Offene Fristen und Wiedervorlagen"
      description="Arbeitsliste für fällige, kritische und nachzuhaltende SBV-Vorgänge."
    >
      <DataTable
        headers={['Status', 'Titel', 'Bezug', 'Fällig', 'Restzeit', 'Priorität', 'Aktionen']}
        rows={rows}
        ariaLabel="Offene Fristen und Wiedervorlagen"
        empty={<EmptyState title="Keine offenen Fristen" text="Keine offenen Fristen vorhanden." />}
      />
    </IndustrialPanel>
  );
}
