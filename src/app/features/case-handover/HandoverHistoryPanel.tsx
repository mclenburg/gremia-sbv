import type { CaseHandoverCockpitItem } from '../../../domain/models/case-handover.model';
import { DataTable, EmptyState } from '../../shared/components/WorkbenchData';
import { IndustrialPanel } from '../../shared/components/WorkbenchPanels';
import { handoverStatusLabel } from './caseHandoverCockpitPolicy';

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('de-DE') : value;
}

export function HandoverHistoryPanel({ outgoing, incoming }: { outgoing: CaseHandoverCockpitItem[]; incoming: CaseHandoverCockpitItem[] }) {
  const items = [...outgoing, ...incoming].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return <IndustrialPanel kicker="Nachweis" title="Übergabeverlauf" description="Lokaler Nachweis der gesendeten, übernommenen und zurückgespielten Pakete.">
    <DataTable ariaLabel="Übergabeverlauf" headers={['Richtung', 'Fallakten', 'Erstellt', 'Gültig bis', 'Status']} empty={<EmptyState title="Noch keine Übergabe" text="Exportierte und importierte Übergabepakete werden hier ohne vertrauliche Inhaltsdaten nachgehalten." />} rows={items.map((item) => ({
      id: item.id,
      cells: [item.direction === 'outgoing' ? 'Ausgang' : 'Eingang', item.caseLabels.join(', ') || `${item.caseCount} Fallakte(n)`, formatDate(item.createdAt), formatDate(item.validUntil), handoverStatusLabel(item)],
    }))} />
  </IndustrialPanel>;
}
