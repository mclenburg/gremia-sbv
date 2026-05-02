import { AlertTriangle, CalendarClock, CheckCircle2, Edit3, ShieldAlert } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { DeadlineDashboardItem } from '../../core/models/deadline.model';
import { DeadlineSeverityBadge, DeadlineStateBadge } from './DeadlineBadge';

function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso));
}

function formatRemaining(hours: number): string {
  if (hours < 0) return `seit ${Math.abs(Math.round(hours))} h überfällig`;
  if (hours < 1) return 'unter 1 h verbleibend';
  return `${Math.round(hours)} h verbleibend`;
}

function formatCaseRef(item: DeadlineDashboardItem, casesById: Map<string, CaseRecord>): string {
  if (item.caseId) {
    const linkedCase = casesById.get(item.caseId);
    return linkedCase?.caseNumber ? `Fall ${linkedCase.caseNumber}` : 'Fallzuordnung nicht auflösbar';
  }

  return item.processType === 'custom' && item.deadlineType === 'follow_up'
    ? 'Freie Wiedervorlage'
    : 'Fallzuordnung fehlt';
}

export function DeadlineDashboardPanel({
  items,
  onEdit,
  onComplete,
  cases = []
}: {
  items: DeadlineDashboardItem[];
  onEdit?: (deadline: DeadlineDashboardItem) => void;
  onComplete?: (deadline: DeadlineDashboardItem) => void;
  cases?: CaseRecord[];
}) {
  const casesById = new Map(cases.map((item) => [item.id, item]));
  const criticalCount = items.filter((item) => item.dashboardState === 'critical' || item.dashboardState === 'overdue').length;

  return (
    <section className="industrial-panel industrial-deadline-panel">
      <div className="industrial-panel-header">
        <div>
          <div className="industrial-chip industrial-chip-warning">
            <CalendarClock className="h-4 w-4" />
            Pflichtanzeige ab 48 Stunden
          </div>
          <h2>Fristen & Wiedervorlagen</h2>
          <p>
            Dashboard-Fristen sind Arbeitsobjekte: öffnen, korrigieren, erledigen oder sauber in der Fallakte nachhalten.
          </p>
        </div>
        <div className="industrial-counter">
          <strong>{items.length}</strong>
          <span>Dashboard-Fristen</span>
        </div>
      </div>

      {criticalCount > 0 && (
        <div className="industrial-alert industrial-alert-danger">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{criticalCount} Frist(en) sind kritisch oder überfällig. Diese Vorgänge zuerst prüfen und die Bearbeitung dokumentieren.</p>
        </div>
      )}

      {!items.length && <div className="industrial-empty">Keine offenen Fristen im 48h-Fenster.</div>}

      <div className="industrial-deadline-grid">
        {items.map((item) => (
          <article key={item.id} className="industrial-deadline-card">
            <div className="industrial-card-status-row">
              <DeadlineStateBadge state={item.dashboardState} />
              <DeadlineSeverityBadge severity={item.severity} />
            </div>
            <h3>{item.safeTitle}</h3>
            <p className="industrial-meta">{formatCaseRef(item, casesById)} · {item.processType}</p>
            <div className="industrial-data-strip">
              <p>Fällig: {formatDueDate(item.dueAt)}</p>
              <span>{formatRemaining(item.hoursRemaining)}</span>
            </div>
            {item.legalBasis && <p className="industrial-legal-note">Rechtsbezug: {item.legalBasis}</p>}
            <div className="industrial-action-note">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
              <p>{item.actionHint}</p>
            </div>
            <div className="industrial-card-actions">
              <button type="button" className="industrial-secondary-button" onClick={() => onEdit?.(item)}>
                <Edit3 className="h-4 w-4" />
                Bearbeiten
              </button>
              <button type="button" className="industrial-secondary-button" onClick={() => onComplete?.(item)}>
                <CheckCircle2 className="h-4 w-4" />
                Erledigt
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
