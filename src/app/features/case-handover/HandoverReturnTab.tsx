import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseHandoverCockpitItem } from '../../../domain/models/case-handover.model';
import { HandoverReturnPanel } from './HandoverReturnPanel';
import { MobileReturnImportPanel } from './MobileReturnImportPanel';
import { VacationV5ReturnExportPanel } from './VacationV5ReturnExportPanel';

export function HandoverReturnTab({
  items,
  cases,
  onCompleted,
}: {
  items: CaseHandoverCockpitItem[];
  cases: CaseRecord[];
  onCompleted: () => Promise<void>;
}) {
  return <div className="industrial-stack">
    <MobileReturnImportPanel onImported={onCompleted} />
    <VacationV5ReturnExportPanel onCompleted={onCompleted} />
    <HandoverReturnPanel items={items} cases={cases} onCompleted={onCompleted} />
  </div>;
}
