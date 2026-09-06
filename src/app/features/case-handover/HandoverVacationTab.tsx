import type { CaseRecord } from '../../../domain/models/case.model';
import { VacationHandoverExportPanel } from './VacationHandoverExportPanel';

export function HandoverVacationTab({
  cases,
  onCompleted,
}: {
  cases: CaseRecord[];
  onCompleted: () => Promise<void>;
}) {
  return <VacationHandoverExportPanel cases={cases} onCompleted={onCompleted} />;
}
