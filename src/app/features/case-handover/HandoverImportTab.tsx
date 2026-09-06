import { HandoverImportPanel } from './HandoverImportPanel';

export function HandoverImportTab({ onCompleted }: { onCompleted: () => Promise<void> }) {
  return <HandoverImportPanel onCompleted={onCompleted} />;
}
