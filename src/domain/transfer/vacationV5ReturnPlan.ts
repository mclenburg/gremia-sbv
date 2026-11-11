import { decideVacationV5ReturnItem, type VacationV5ReturnDecision } from './vacationV5ReturnDecision';

export interface VacationV5ReturnInventoryItem {
  ref: string;
  kind: string;
  status: 'unchanged' | 'changed' | 'missing';
  baselineSha256: string;
  currentSha256: string | null;
}

export interface VacationV5OriginInventoryItem {
  ref: string;
  kind: string;
  baselineSha256: string;
  currentSha256: string | null;
}

export interface VacationV5ReturnAddition {
  ref: string;
  kind: string;
  currentSha256: string;
}

export interface VacationV5PlannedReturnItem {
  ref: string;
  kind: string;
  decision: Exclude<VacationV5ReturnDecision, 'omit'>;
}

function assertIdentity(item: { ref: string; kind: string }): void {
  if (!/^[a-z_]+_[1-9][0-9]*$/.test(item.ref) || !/^[a-z_]+$/.test(item.kind)) {
    throw new Error('Rückgabe enthält eine ungültige Vorgangsreferenz.');
  }
}

export function planVacationV5Return(deputyItems: readonly VacationV5ReturnInventoryItem[],
  originItems: readonly VacationV5OriginInventoryItem[], options: {
    cancellationRefs?: readonly string[]; additions?: readonly VacationV5ReturnAddition[];
  } = {}): VacationV5PlannedReturnItem[] {
  const originByRef = new Map<string, VacationV5OriginInventoryItem>();
  for (const item of originItems) {
    assertIdentity(item);
    if (originByRef.has(item.ref)) throw new Error('Ursprungsledger enthält eine doppelte Referenz.');
    originByRef.set(item.ref, item);
  }
  const cancellationRefs = new Set(options.cancellationRefs ?? []);
  if (cancellationRefs.size !== (options.cancellationRefs?.length ?? 0)) {
    throw new Error('Rückgabe enthält doppelte Stornowünsche.');
  }
  const seen = new Set<string>();
  const planned: VacationV5PlannedReturnItem[] = [];
  for (const item of deputyItems) {
    assertIdentity(item);
    if (seen.has(item.ref)) throw new Error('Rückgabe enthält eine doppelte Referenz.');
    seen.add(item.ref);
    const origin = originByRef.get(item.ref);
    if (!origin || origin.kind !== item.kind) throw new Error('Rückgabe kann keinem ursprünglichen Vorgang zugeordnet werden.');
    if ((item.status === 'missing') !== (item.currentSha256 === null)
      || (item.status === 'unchanged' && item.currentSha256 !== item.baselineSha256)
      || (item.status === 'changed' && item.currentSha256 === item.baselineSha256)) {
      throw new Error('Rückgabe enthält einen widersprüchlichen Änderungsstand.');
    }
    const cancel = cancellationRefs.has(item.ref);
    if (item.status === 'missing' && !cancel) {
      throw new Error('Entfernte Vertretungskopie benötigt einen ausdrücklich dokumentierten Stornowunsch.');
    }
    const { decision } = decideVacationV5ReturnItem({
      operation: cancel ? 'cancel_request' : 'upsert', originBaseline: origin.baselineSha256,
      originCurrent: origin.currentSha256, deputyBaseline: item.baselineSha256,
      deputyCurrent: item.currentSha256,
    });
    if (decision !== 'omit') planned.push({ ref: item.ref, kind: item.kind, decision });
  }
  for (const ref of cancellationRefs) {
    if (!seen.has(ref)) throw new Error('Stornowunsch verweist auf keinen importierten Vorgang.');
  }
  for (const item of options.additions ?? []) {
    assertIdentity(item);
    if (seen.has(item.ref) || originByRef.has(item.ref)) throw new Error('Neuer Vorgang verwendet eine bestehende Referenz.');
    seen.add(item.ref);
    const { decision } = decideVacationV5ReturnItem({ operation: 'upsert', originBaseline: null,
      originCurrent: null, deputyBaseline: null, deputyCurrent: item.currentSha256 });
    if (decision !== 'review_addition') throw new Error('Neuer Vorgang muss einzeln geprüft werden.');
    planned.push({ ref: item.ref, kind: item.kind, decision });
  }
  return planned;
}
