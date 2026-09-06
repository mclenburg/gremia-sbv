import type { CaseRecord } from '../../../domain/models/case.model';
import type { OfficeHandoverScope } from '../../../domain/models/case-handover.model';
import { OfficeHandoverExportPanel } from './OfficeHandoverExportPanel';

export function HandoverOfficeTab({
  cases,
  inventory,
  onCompleted,
}: {
  cases: CaseRecord[];
  inventory: OfficeHandoverScope;
  onCompleted: () => Promise<void>;
}) {
  return <OfficeHandoverExportPanel cases={cases} inventory={inventory} onCompleted={onCompleted} />;
}
