import { ShieldAlert } from 'lucide-react';
import type { ParticipationRecord } from '../../../core/models/participation.model';
import type { ViewId } from '../../../core/navigation/modules';
import { EmptyState, IndustrialRecordCard } from '../../../shared/components/WorkbenchLayout';
import { riskLevelToTone } from '../../../shared/status/statusTone';
import { getParticipationEscalationAdvice } from '../../participation/participationPolicy';
import { SbvControlPanel } from './SbvControlPanel';

export function ParticipationPanel({
  participations,
  onNavigate,
}: {
  participations: ParticipationRecord[];
  onNavigate?: (viewId: ViewId) => void;
}) {
  return (
    <SbvControlPanel
      icon={<ShieldAlert className="h-5 w-5" />}
      kicker="§ 178 Abs. 2 Satz 1 SGB IX"
      title="Beteiligung steuern"
      actionLabel="Beteiligungsmonitor öffnen"
      onAction={onNavigate ? () => onNavigate('participation') : undefined}
    >
      <div className="sbv-control-compact-list">
        {participations.slice(0, 5).map((record) => {
          const advice = getParticipationEscalationAdvice(record);
          return (
            <IndustrialRecordCard key={record.id} className="sbv-control-row" tone={riskLevelToTone(advice.level)}>
              <div>
                <strong>{record.title}</strong>
                <span>{advice.title}</span>
              </div>
              <p>{advice.nextStep}</p>
            </IndustrialRecordCard>
          );
        })}
        {participations.length === 0 && (
          <EmptyState
            title="Noch keine Beteiligungsvorgänge"
            text="Neue Vorgänge werden im Beteiligungsmodul oder aus einer Fallakte heraus angelegt."
          />
        )}
      </div>
    </SbvControlPanel>
  );
}
