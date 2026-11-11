import { describe, expect, it } from 'vitest';
import { decideVacationV5ReturnItem } from '../../../../src/domain/transfer/vacationV5ReturnDecision';

const originBaseline = 'a'.repeat(64);
const originChanged = 'b'.repeat(64);
const deputyBaseline = 'c'.repeat(64);
const deputyChanged = 'd'.repeat(64);

describe('Format-5-Rückgabeentscheidung', () => {
  it('lässt unveränderte Stellvertretungszeilen aus und schlägt nur bei unverändertem Ursprung eine Übernahme vor', () => {
    expect(decideVacationV5ReturnItem({ operation: 'upsert', originBaseline, originCurrent: originBaseline,
      deputyBaseline, deputyCurrent: deputyBaseline }).decision).toBe('omit');
    expect(decideVacationV5ReturnItem({ operation: 'upsert', originBaseline, originCurrent: originBaseline,
      deputyBaseline, deputyCurrent: deputyChanged }).decision).toBe('propose_update');
    expect(decideVacationV5ReturnItem({ operation: 'upsert', originBaseline, originCurrent: originChanged,
      deputyBaseline, deputyCurrent: deputyChanged }).decision).toBe('review_conflict');
    expect(decideVacationV5ReturnItem({ operation: 'upsert', originBaseline, originCurrent: null,
      deputyBaseline, deputyCurrent: deputyChanged }).decision).toBe('review_conflict');
  });

  it('behandelt neue Zeilen und Löschwünsche immer als manuelle Prüfung', () => {
    expect(decideVacationV5ReturnItem({ operation: 'upsert', originBaseline: null, originCurrent: null,
      deputyBaseline: null, deputyCurrent: deputyChanged }).decision).toBe('review_addition');
    expect(decideVacationV5ReturnItem({ operation: 'cancel_request', originBaseline, originCurrent: originBaseline,
      deputyBaseline, deputyCurrent: null }).decision).toBe('review_removal');
    expect(() => decideVacationV5ReturnItem({ operation: 'upsert', originBaseline, originCurrent: originBaseline,
      deputyBaseline: null, deputyCurrent: deputyChanged })).toThrow(/Ausgangsbasis/);
  });
});
