import { ClipboardCheck } from 'lucide-react';
import { IndustrialSelectionCard } from '../../../shared/components/WorkbenchLayout';
import { inclusionTopics } from '../sbvControlTypes';
import { SbvControlPanel } from './SbvControlPanel';

export function InclusionPanel() {
  return (
    <SbvControlPanel
      icon={<ClipboardCheck className="h-5 w-5" />}
      kicker="§ 166 SGB IX"
      title="Inklusionsvereinbarung fortschreiben"
    >
      <div className="sbv-control-card-grid">
        {inclusionTopics.map((topic) => (
          <IndustrialSelectionCard key={topic.id} className="sbv-control-mini-card">
            <strong>{topic.title}</strong>
            <span>{topic.legalBasis}</span>
            <p>{topic.sbvGoal}</p>
            <em>{topic.enforceableAnchor}</em>
          </IndustrialSelectionCard>
        ))}
      </div>
    </SbvControlPanel>
  );
}
