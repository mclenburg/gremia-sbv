import { HandoverImportPanel } from './HandoverImportPanel';
import { VacationV5ReturnImportPanel } from './VacationV5ReturnImportPanel';

export function HandoverImportTab({ onCompleted }: { onCompleted: () => Promise<void> }) {
  return <div className="industrial-stack">
    <HandoverImportPanel onCompleted={onCompleted} />
    <VacationV5ReturnImportPanel onCompleted={onCompleted} />
  </div>;
}
