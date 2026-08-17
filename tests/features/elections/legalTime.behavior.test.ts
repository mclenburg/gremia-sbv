import { describe, expect, it } from 'vitest';
import { legalCalendarDate } from '../../../src/domain/time/legalTime';

describe('legal election calendar dates', () => {
  it('uses the German legal calendar day instead of the UTC day', () => {
    const shortlyAfterMidnightInBerlin = new Date('2026-08-17T22:30:00.000Z');

    expect(legalCalendarDate(shortlyAfterMidnightInBerlin)).toBe('2026-08-18');
  });

  it('handles the winter time boundary independently from the host timezone', () => {
    const shortlyAfterMidnightInBerlin = new Date('2026-01-10T23:30:00.000Z');

    expect(legalCalendarDate(shortlyAfterMidnightInBerlin)).toBe('2026-01-11');
  });
});
