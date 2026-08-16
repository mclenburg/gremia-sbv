import type { ViewId } from '../../../core/navigation/modules';
import { IndustrialRecordCard } from '../../../shared/components/WorkbenchLayout';
import { SbvControlPanel } from './SbvControlPanel';

export type ReportHint = { label: string; value: number };

export function ReportsPanel({
  reportHints,
  onNavigate,
}: {
  reportHints: ReportHint[];
  onNavigate?: (viewId: ViewId) => void;
}) {
  return (
    <SbvControlPanel
      kicker="Berichte"
      title="Tätigkeitsbericht vorbereiten"
      actionLabel="Berichte öffnen"
      onAction={onNavigate ? () => onNavigate('reports') : undefined}
    >
      <div className="sbv-control-metric-grid">
        {reportHints.map((hint) => (
          <IndustrialRecordCard key={hint.label}>
            <strong>{hint.value}</strong>
            <span>{hint.label}</span>
          </IndustrialRecordCard>
        ))}
      </div>
    </SbvControlPanel>
  );
}
