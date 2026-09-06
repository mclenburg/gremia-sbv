import type { CaseHandoverCockpitItem } from '../../../domain/models/case-handover.model';
import { HandoverHistoryPanel } from './HandoverHistoryPanel';

export function HandoverProtocolTab({
  outgoing,
  incoming,
}: {
  outgoing: CaseHandoverCockpitItem[];
  incoming: CaseHandoverCockpitItem[];
}) {
  return <HandoverHistoryPanel outgoing={outgoing} incoming={incoming} />;
}
