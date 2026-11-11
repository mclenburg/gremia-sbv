import { describe, expect, it } from 'vitest';
import { planVacationV5Return } from '../../../../src/domain/transfer/vacationV5ReturnPlan';

const hash = (digit: string) => digit.repeat(64);
const deputy = (ref: string, status: 'unchanged' | 'changed' | 'missing', currentSha256: string | null) => ({
  ref, kind: 'meeting', status, baselineSha256: hash('a'), currentSha256,
});
const origin = (ref: string, currentSha256: string | null) => ({
  ref, kind: 'meeting', baselineSha256: hash('b'), currentSha256,
});

describe('Format-5-Rückgabeplanung', () => {
  it('überträgt unveränderte Zeilen nicht und schlägt einseitige Änderungen vor', () => {
    expect(planVacationV5Return(
      [deputy('meeting_1', 'unchanged', hash('a')), deputy('meeting_2', 'changed', hash('c'))],
      [origin('meeting_1', hash('b')), origin('meeting_2', hash('b'))],
    )).toEqual([{ ref: 'meeting_2', kind: 'meeting', decision: 'propose_update' }]);
  });

  it('markiert beidseitige Änderungen, neue Zeilen und ausdrückliche Stornowünsche zur Einzelprüfung', () => {
    expect(planVacationV5Return(
      [deputy('meeting_1', 'changed', hash('c')), deputy('meeting_2', 'missing', null)],
      [origin('meeting_1', hash('d')), origin('meeting_2', hash('b'))],
      { cancellationRefs: ['meeting_2'], additions: [{ ref: 'return_meeting_1', kind: 'meeting', currentSha256: hash('e') }] },
    )).toEqual([
      { ref: 'meeting_1', kind: 'meeting', decision: 'review_conflict' },
      { ref: 'meeting_2', kind: 'meeting', decision: 'review_removal' },
      { ref: 'return_meeting_1', kind: 'meeting', decision: 'review_addition' },
    ]);
  });

  it('lehnt fehlende Zuordnungen, doppelte Referenzen und stillschweigende Löschungen ab', () => {
    expect(() => planVacationV5Return([deputy('meeting_1', 'changed', hash('c'))], [])).toThrow();
    expect(() => planVacationV5Return([deputy('meeting_1', 'missing', null)], [origin('meeting_1', hash('b'))])).toThrow();
    expect(() => planVacationV5Return([deputy('meeting_1', 'changed', hash('c')),
      deputy('meeting_1', 'changed', hash('c'))], [origin('meeting_1', hash('b'))])).toThrow();
    expect(() => planVacationV5Return([deputy('meeting_1', 'changed', hash('c'))],
      [{ ...origin('meeting_1', hash('b')), kind: 'violation' }])).toThrow();
  });
});
