export type VacationV5ReturnDecision = 'omit' | 'propose_update' | 'review_conflict'
  | 'review_addition' | 'review_removal';

export interface VacationV5ReturnItemState {
  operation: 'upsert' | 'cancel_request';
  originBaseline: string | null;
  originCurrent: string | null;
  deputyBaseline: string | null;
  deputyCurrent: string | null;
}

export function decideVacationV5ReturnItem(input: VacationV5ReturnItemState): { decision: VacationV5ReturnDecision } {
  for (const hash of [input.originBaseline, input.originCurrent, input.deputyBaseline, input.deputyCurrent]) {
    if (hash !== null && !/^[0-9a-f]{64}$/.test(hash)) throw new Error('Rückgabe enthält eine ungültige Vergleichsbasis.');
  }
  if ((input.originBaseline === null) !== (input.deputyBaseline === null)) {
    throw new Error('Rückgabe enthält keine zusammengehörige Ausgangsbasis.');
  }
  if (input.operation === 'cancel_request') return { decision: 'review_removal' };
  if (input.operation !== 'upsert' || input.deputyCurrent === null) {
    throw new Error('Rückgabe enthält keinen gültigen Änderungsstand.');
  }
  if (input.deputyBaseline === null) {
    return { decision: input.originCurrent === null ? 'review_addition' : 'review_conflict' };
  }
  if (input.deputyCurrent === input.deputyBaseline) return { decision: 'omit' };
  return { decision: input.originCurrent === input.originBaseline ? 'propose_update' : 'review_conflict' };
}
