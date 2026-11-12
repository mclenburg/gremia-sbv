import type { CaseRecord } from '../../../domain/models/case.model';
import { VacationHandoverExportPanel } from './VacationHandoverExportPanel';
import { VacationV5ExportPanel } from './VacationV5ExportPanel';

export function HandoverVacationTab({
  cases,
  onCompleted,
}: {
  cases: CaseRecord[];
  onCompleted: () => Promise<void>;
}) {
  return <div className="industrial-stack">
    <VacationV5ExportPanel onCompleted={onCompleted} />
    <VacationHandoverExportPanel cases={cases} onCompleted={onCompleted} />
  </div>;
}
