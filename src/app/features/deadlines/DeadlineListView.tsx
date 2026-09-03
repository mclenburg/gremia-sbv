import { CheckCircle2, Edit3, ExternalLink, TimerReset } from 'lucide-react';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import {
  DataTable,
  EmptyState,
  IndustrialPanel,
  type DataTableRow
} from '../../shared/components/WorkbenchLayout';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseMeasureRecord } from '../../../domain/models/case-measure.model';
import type { DeadlineRecord } from '../../../domain/models/deadline.model';
import { getDashboardState, getHoursRemaining } from '../../core/deadlineLogic';
import { DeadlineSeverityBadge, DeadlineStateBadge } from './DeadlineBadge';
import { deadlineTypeLabels } from './deadlineLabels';
import { ActivityJournalContextButton } from '../activity-journal/components/ActivityJournalContextButton';
import { resolveDeadlineContextInfo } from './deadlineContext';

function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function DeadlineListView({
  deadlines,
  onEdit,
  onComplete,
  onExtend,
  onOpenContext,
  cases = [],
  measures = []
}: {
  deadlines: DeadlineRecord[];
  onEdit?: (deadline: DeadlineRecord) => void;
  onComplete?: (deadline: DeadlineRecord) => void;
  onExtend?: (deadline: DeadlineRecord) => void;
  onOpenContext?: (deadline: DeadlineRecord) => void;
  cases?: CaseRecord[];
  measures?: CaseMeasureRecord[];
}) {
  const casesById = new Map(cases.map((item) => [item.id, item]));
  const measuresById = new Map(measures.map((item) => [item.id, item]));

  const rows: DataTableRow[] = deadlines.map((deadline) => {
    const hours = getHoursRemaining(deadline.dueAt);
    const state = getDashboardState(deadline);
    const context = resolveDeadlineContextInfo(deadline, casesById, measuresById);

    return {
      id: deadline.id,
      cells: [
        <DeadlineStateBadge state={state} />,
        <>
          <p className="industrial-table-primary">{deadline.title}</p>
          <p className="industrial-table-secondary">{deadlineTypeLabels[deadline.deadlineType]} · {context.secondary}</p>
        </>,
        <>
          <p className="industrial-table-primary">{context.primary}</p>
          <p className="industrial-table-secondary">{context.secondary}</p>
        </>,
        formatDueDate(deadline.dueAt),
        hours < 0 ? 'überfällig' : `${Math.round(hours)} h`,
        <DeadlineSeverityBadge severity={deadline.severity} />,
        <div className="industrial-table-actions">
          <ToolbarButton onClick={() => onOpenContext?.(deadline)}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> {context.actionLabel}
          </ToolbarButton>
          <ToolbarButton onClick={() => onEdit?.(deadline)}>
            <Edit3 className="h-4 w-4" aria-hidden="true" /> Bearbeiten
          </ToolbarButton>
          <ToolbarButton onClick={() => onExtend?.(deadline)}>
            <TimerReset className="h-4 w-4" aria-hidden="true" /> Verlängern
          </ToolbarButton>
          <ActivityJournalContextButton
            compact
            label="Tätigkeit zur Frist erfassen"
            context={{
              contextType: 'deadline',
              contextId: deadline.id,
              caseId: deadline.caseId,
              title: deadline.title,
              category: 'documentation',
            }}
          />
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
