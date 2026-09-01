import { AlertTriangle, CalendarClock, CheckCircle2, Edit3, ExternalLink, ShieldAlert, TimerReset } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseMeasureRecord } from '../../../domain/models/case-measure.model';
import type { DeadlineDashboardItem } from '../../../domain/models/deadline.model';
import { DeadlineSeverityBadge, DeadlineStateBadge } from './DeadlineBadge';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { EmptyState, IndustrialPanel, IndustrialRecordCard, IndustrialWarningPanel } from '../../shared/components/WorkbenchLayout';
import { resolveDeadlineContextInfo } from './deadlineContext';

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

export function DeadlineDashboardPanel({
  items,
  onEdit,
  onComplete,
  onExtend,
  onOpenContext,
  cases = [],
  measures = []
}: {
  items: DeadlineDashboardItem[];
  onEdit?: (deadline: DeadlineDashboardItem) => void;
  onComplete?: (deadline: DeadlineDashboardItem) => void;
  onExtend?: (deadline: DeadlineDashboardItem) => void;
  onOpenContext?: (deadline: DeadlineDashboardItem) => void;
  cases?: CaseRecord[];
  measures?: CaseMeasureRecord[];
}) {
  const casesById = new Map(cases.map((item) => [item.id, item]));
  const measuresById = new Map(measures.map((item) => [item.id, item]));
  const criticalCount = items.filter((item) => item.dashboardState === 'critical' || item.dashboardState === 'overdue').length;

  return (
    <IndustrialPanel className="industrial-deadline-panel">
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
        <div className="industrial-counter industrial-deadline-counter">
          <strong>{items.length}</strong>
          <span>Offene Fristen</span>
        </div>
      </div>

      {criticalCount > 0 && (
        <IndustrialWarningPanel className="industrial-alert-danger">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{criticalCount} Frist(en) sind kritisch oder überfällig. Diese Vorgänge zuerst prüfen und die Bearbeitung dokumentieren.</p>
        </IndustrialWarningPanel>
      )}

      {!items.length && <EmptyState title="Keine offenen Fristen" text="Keine offenen Fristen im 48h-Fenster." />}

      <div className="industrial-deadline-grid">
        {items.map((item) => {
          const context = resolveDeadlineContextInfo(item, casesById, measuresById);
          return (
          <IndustrialRecordCard key={item.id} className="industrial-deadline-card">
            <div className="industrial-card-status-row">
              <DeadlineStateBadge state={item.dashboardState} />
              <DeadlineSeverityBadge severity={item.severity} />
            </div>
            <h3>{item.safeTitle}</h3>
            <div className="industrial-deadline-context">
              <p><span>Kontext</span>{context.primary}</p>
              <p><span>Vorgang</span>{context.secondary}</p>
            </div>
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
              <ToolbarButton onClick={() => onOpenContext?.(item)}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {context.actionLabel}
              </ToolbarButton>
              <ToolbarButton onClick={() => onEdit?.(item)}>
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Bearbeiten
              </ToolbarButton>
              <ToolbarButton onClick={() => onExtend?.(item)}>
                <TimerReset className="h-4 w-4" aria-hidden="true" />
                Verlängern
              </ToolbarButton>
              <ToolbarButton onClick={() => onComplete?.(item)}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Erledigt
              </ToolbarButton>
            </div>
          </IndustrialRecordCard>
        );})}
      </div>
    </IndustrialPanel>
  );
}
