import type { GremiaBrInformationRequest } from '../../../domain/models/gremia-br.model';
import { DataTable, EmptyState } from '../../shared/components/WorkbenchLayout';

const STATUS_LABELS: Record<GremiaBrInformationRequest['status'], string> = {
  OPEN: 'Offen', PARTIALLY_FULFILLED: 'Teilweise erfüllt', FULFILLED: 'Erfüllt', WITHDRAWN: 'Zurückgezogen',
};

export function GremiaBrInformationRequestsTable({ requests }: { requests: GremiaBrInformationRequest[] }) {
  return (
    <DataTable
      ariaLabel="Informationsanforderungen des verknüpften Verfahrens"
      headers={['Anforderung', 'Status', 'Angefordert', 'Antwort fällig']}
      rows={requests.map((request, index) => ({
        id: request.id,
        cells: [
          `Informationsanforderung ${index + 1}`,
          STATUS_LABELS[request.status],
          new Date(request.requestedAt).toLocaleDateString('de-DE'),
          request.responseDueAt ? new Date(request.responseDueAt).toLocaleDateString('de-DE') : 'Keine Frist',
        ],
      }))}
      empty={<EmptyState title="Keine Informationsanforderungen" text="Für dieses Verfahren sind derzeit keine Anforderungen vorhanden." />}
    />
  );
}
