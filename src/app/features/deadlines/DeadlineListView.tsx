import { CheckCircle2, Edit3 } from 'lucide-react';
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

  return (
    <section className="industrial-panel">
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Fristenregister</p>
          <h2>Alle offenen Fristen</h2>
          <p>Rechtliche Fristen und Workflow-Schritte brauchen einen Fallbezug. Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig.</p>
        </div>
      </div>

      <div className="industrial-table-shell mt-5">
        <table className="industrial-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Frist</th>
              <th>Fall</th>
              <th>Maßnahme</th>
              <th>Fällig</th>
              <th>Restzeit</th>
              <th>Schwere</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((deadline) => {
              const hours = getHoursRemaining(deadline.dueAt);
              const state = getDashboardState(deadline);
              return (
                <tr key={deadline.id}>
                  <td><DeadlineStateBadge state={state} /></td>
                  <td>
                    <p className="industrial-table-primary">{deadline.title}</p>
                    <p className="industrial-table-secondary">{deadline.deadlineType} · {deadline.processType}</p>
                  </td>
                  <td>{formatCase(deadline, casesById)}</td>
                  <td>{formatMeasure(deadline, measuresById)}</td>
                  <td>{formatDueDate(deadline.dueAt)}</td>
                  <td>{hours < 0 ? 'überfällig' : `${Math.round(hours)} h`}</td>
                  <td><DeadlineSeverityBadge severity={deadline.severity} /></td>
                  <td>
                    <div className="industrial-table-actions">
                      <button type="button" onClick={() => onEdit?.(deadline)}><Edit3 className="h-4 w-4" /> Bearbeiten</button>
                      <button type="button" onClick={() => onComplete?.(deadline)}><CheckCircle2 className="h-4 w-4" /> Erledigt</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!deadlines.length && (
              <tr>
                <td colSpan={8}>Keine offenen Fristen vorhanden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
