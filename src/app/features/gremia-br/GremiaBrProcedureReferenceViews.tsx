import type { GremiaBrExternalReferenceRecord, GremiaBrOwnTask, GremiaBrProcedureDetail } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { DataTable, EmptyState } from '../../shared/components/WorkbenchLayout';
import { GREMIA_BR_TASK_STATUS_LABELS } from './gremiaBrTaskPresentation';

const STATE_LABELS: Record<string, string> = {
  RECEIVED: 'Eingegangen', UNDER_REVIEW: 'In Prüfung', INFORMATION_REQUESTED: 'Information angefordert',
  READY: 'Bereit', IN_PROGRESS: 'In Bearbeitung', DECISION_PENDING: 'Entscheidung ausstehend',
  DECIDED: 'Entschieden', COMMUNICATION_PENDING: 'Mitteilung ausstehend', COMMUNICATED: 'Mitgeteilt',
  COMPLETED: 'Abgeschlossen', CANCELLED: 'Abgebrochen',
};
const COMPLETENESS_LABELS: Record<string, string> = {
  NOT_CHECKED: 'Nicht geprüft', NOT_REVIEWED: 'Nicht geprüft', COMPLETE: 'Vollständig',
  INCOMPLETE: 'Unvollständig', INFORMATION_REQUESTED: 'Information angefordert',
  REQUIRE_CONFIRMATION: 'Bestätigung erforderlich',
};
const DEADLINE_STATUS_LABELS: Record<string, string> = {
  CALCULATED: 'Berechnet', CONFIRMED: 'Bestätigt', SUPERSEDED: 'Ersetzt', EXPIRED: 'Abgelaufen', CANCELLED: 'Aufgehoben',
};

export function GremiaBrProcedureSummary({ detail }: { detail: GremiaBrProcedureDetail }) {
  return (
    <div className="industrial-form-section">
      <h3>Aktueller Verfahrensstand</h3>
      <dl className="industrial-meta-grid">
        <div><dt>Verfahrensart</dt><dd>{detail.procedureType === 'SBV_PARTICIPATION' ? 'SBV-Beteiligung' : 'Verfahren'}</dd></div>
        <div><dt>Status</dt><dd>{STATE_LABELS[detail.state] ?? 'Status nicht zugeordnet'}</dd></div>
        <div><dt>Technische Vollständigkeit</dt><dd>{COMPLETENESS_LABELS[detail.technicalCompleteness] ?? 'Nicht zugeordnet'}</dd></div>
        <div><dt>Fachliche Vollständigkeit</dt><dd>{COMPLETENESS_LABELS[detail.substantiveCompleteness] ?? 'Nicht zugeordnet'}</dd></div>
        <div><dt>Eröffnet</dt><dd><time dateTime={detail.openedAt}>{new Date(detail.openedAt).toLocaleDateString('de-DE')}</time></dd></div>
        <div><dt>Ergebnis</dt><dd>{detail.outcome ? `${detail.outcome.code} · ${new Date(detail.outcome.recordedAt).toLocaleDateString('de-DE')}` : 'Noch kein Ergebnis erfasst'}</dd></div>
      </dl>
      <h4>Fristen</h4>
      {detail.deadlines.length ? <ul>{detail.deadlines.map((deadline) => (
        <li key={deadline.id}>{deadline.rule}: <time dateTime={deadline.dueAt}>{new Date(deadline.dueAt).toLocaleString('de-DE')}</time> · {DEADLINE_STATUS_LABELS[deadline.status] ?? deadline.status}</li>
      ))}</ul> : <p className="industrial-muted">Keine Fristen gemeldet.</p>}
      <h4>Wiedervorlagen</h4>
      {detail.deferrals.length ? <ul>{detail.deferrals.map((deferral) => (
        <li key={deferral.id}>{deferral.title}: <time dateTime={deferral.dueAt}>{new Date(deferral.dueAt).toLocaleString('de-DE')}</time></li>
      ))}</ul> : <p className="industrial-muted">Keine aktiven Wiedervorlagen gemeldet.</p>}
    </div>
  );
}

export function GremiaBrProcedureLinksTable({ links, busy, onUnlink }: {
  links: GremiaBrExternalReferenceRecord[];
  busy: boolean;
  onUnlink: (id: string) => void;
}) {
  return (
    <DataTable
      ariaLabel="Verknüpfte Gremia.BR-Verfahren der Fallakte"
      headers={['Sachverhalt', 'Aktion']}
      rows={links.map((link) => ({
        id: link.id,
        cells: [link.title, <ToolbarButton key={link.id} disabled={busy} onClick={() => onUnlink(link.id)} aria-label={`Verknüpfung zu ${link.title} aufheben`}>Verknüpfung aufheben</ToolbarButton>],
      }))}
      empty={<EmptyState title="Keine Verknüpfung" text="Für diese Fallakte ist noch kein Gremia.BR-Verfahren verknüpft." />}
    />
  );
}

export function GremiaBrProcedureOwnTasks({ procedureId, tasks, onOpenTask }: {
  procedureId: string;
  tasks: GremiaBrOwnTask[];
  onOpenTask: (id: string) => void;
}) {
  const relatedTasks = tasks.filter((task) => task.subjectType === 'PROCEDURE' && task.subjectId === procedureId);
  return (
    <div className="industrial-form-section">
      <h3>Eigene offene Aufgaben</h3>
      <DataTable
        ariaLabel="Eigene offene Aufgaben dieses Verfahrens"
        headers={['Aufgabe', 'Status', 'Fälligkeit', 'Aktion']}
        rows={relatedTasks.map((task) => ({
          id: task.id,
          cells: [
            task.title,
            GREMIA_BR_TASK_STATUS_LABELS[task.status],
            task.dueAt ? new Date(task.dueAt).toLocaleString('de-DE') : 'Keine Fälligkeit',
            <ToolbarButton key={task.id} onClick={() => onOpenTask(task.id)} aria-label={`Details zu ${task.title}`}>Details</ToolbarButton>,
          ],
        }))}
        empty={<EmptyState title="Keine eigenen offenen Aufgaben" text="Im letzten Gremia.BR-Arbeitsstand sind diesem Verfahren keine eigenen offenen Aufgaben zugeordnet." />}
      />
    </div>
  );
}
