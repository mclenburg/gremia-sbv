import { Building2 } from 'lucide-react';
import { RiskBadge } from '../../../shared/components/StatusBadges';
import { DataTable, EmptyState } from '../../../shared/components/WorkbenchLayout';
import { employerObligations } from '../sbvControlTypes';
import { toneLabel } from '../sbvControlLogic';
import { SbvControlPanel } from './SbvControlPanel';

export function ObligationsList() {
  return (
    <SbvControlPanel icon={<Building2 className="h-5 w-5" />} kicker="Strukturmonitor" title="Arbeitgeberpflichten im Blick">
      <DataTable
        ariaLabel="Arbeitgeberpflichten"
        headers={['Pflicht', 'Nachweis', 'SBV-Aktion']}
        empty={<EmptyState text="Keine Arbeitgeberpflichten hinterlegt." />}
        rows={employerObligations.map((item) => ({
          id: item.id,
          cells: [
            <div className="industrial-data-table-cell">
              <strong>{item.title}</strong>
              <span>{item.legalBasis}</span>
            </div>,
            <div className="industrial-data-table-cell">
              <span>{item.cadence}</span>
              <p>{item.evidence}</p>
            </div>,
            <div className="industrial-data-table-cell">
              <RiskBadge risk={item.risk} label={toneLabel(item.risk)} />
              <p>{item.sbvAction}</p>
            </div>,
          ],
        }))}
      />
    </SbvControlPanel>
  );
}
