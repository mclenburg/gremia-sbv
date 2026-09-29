import type { GremiaBrExternalReferenceRecord, GremiaBrProcedureDetail } from '../../../domain/models/gremia-br.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { DataTable, EmptyState } from '../../shared/components/WorkbenchLayout';

const STATE_LABELS: Record<string, string> = {
  RECEIVED: 'Eingegangen', UNDER_REVIEW: 'In Prüfung', INFORMATION_REQUESTED: 'Information angefordert',
  READY: 'Bereit', IN_PROGRESS: 'In Bearbeitung', DECISION_PENDING: 'Entscheidung ausstehend',
  DECIDED: 'Entschieden', COMMUNICATION_PENDING: 'Mitteilung ausstehend', COMMUNICATED: 'Mitgeteilt',
  COMPLETED: 'Abgeschlossen', CANCELLED: 'Abgebrochen',
};

export function GremiaBrProcedureSummary({ detail }: { detail: GremiaBrProcedureDetail }) {
  return (
    <dl className="industrial-meta-grid">
      <div><dt>Verfahrensart</dt><dd>{detail.procedureType === 'SBV_PARTICIPATION' ? 'SBV-Beteiligung' : 'Verfahren'}</dd></div>
      <div><dt>Status</dt><dd>{STATE_LABELS[detail.state] ?? 'Status nicht zugeordnet'}</dd></div>
      <div><dt>Eröffnet</dt><dd><time dateTime={detail.openedAt}>{new Date(detail.openedAt).toLocaleDateString('de-DE')}</time></dd></div>
    </dl>
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
