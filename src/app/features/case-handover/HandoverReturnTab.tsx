import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpitItem } from '../../../domain/models/case-handover.model';
import { HandoverReturnPanel } from './HandoverReturnPanel';

export function HandoverReturnTab({
  items,
  cases,
  onCompleted,
}: {
  items: CaseHandoverCockpitItem[];
  cases: CaseRecord[];
  onCompleted: () => Promise<void>;
}) {
  return <HandoverReturnPanel items={items} cases={cases} onCompleted={onCompleted} />;
}
