import type { GremiaBrInformationRequest } from '../../../domain/models/gremia-br.model';
import { DataTable, EmptyState } from '../../shared/components/WorkbenchLayout';
import { ToolbarButton } from '../../shared/components/IndustrialButton';

const STATUS_LABELS: Record<GremiaBrInformationRequest['status'], string> = {
  OPEN: 'Offen', PARTIALLY_FULFILLED: 'Teilweise erfüllt', FULFILLED: 'Erfüllt', WITHDRAWN: 'Zurückgezogen',
};

export function GremiaBrInformationRequestsTable({ requests, busy, onComplete }: {
  requests: GremiaBrInformationRequest[];
  busy: boolean;
  onComplete: (id: string) => void;
}) {
  return (
    <DataTable
      ariaLabel="Informationsanforderungen des verknüpften Verfahrens"
      headers={['Anforderung', 'Status', 'Angefordert', 'Antwort fällig', 'Aktion']}
      rows={requests.map((request, index) => ({
        id: request.id,
        cells: [
          `Informationsanforderung ${index + 1}`,
          STATUS_LABELS[request.status],
          new Date(request.requestedAt).toLocaleDateString('de-DE'),
          request.responseDueAt ? new Date(request.responseDueAt).toLocaleDateString('de-DE') : 'Keine Frist',
          ['OPEN', 'PARTIALLY_FULFILLED'].includes(request.status) ? (
            <ToolbarButton key={request.id} disabled={busy} onClick={() => onComplete(request.id)} aria-label={`Informationsanforderung ${index + 1} als erfüllt abschließen`}>
              Als erfüllt abschließen
            </ToolbarButton>
          ) : '',
        ],
      }))}
      empty={<EmptyState title="Keine Informationsanforderungen" text="Für dieses Verfahren sind derzeit keine Anforderungen vorhanden." />}
    />
  );
}
