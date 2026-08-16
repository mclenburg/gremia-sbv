import { describe, expect, it } from 'vitest';
import { canMarkAssemblyReady, shouldWarnAboutAnnualAssembly } from '../../../services/sbvAssemblyPolicy.js';

describe('SBV assembly policy', () => {
  it('erlaubt bereit nur mit Termin und Einladung', () => {
    expect(canMarkAssemblyReady({ scheduledAt: '2026-11-03T09:00:00.000Z' })).toBe(false);
    expect(canMarkAssemblyReady({ invitationAt: '2026-10-01' })).toBe(false);
    expect(canMarkAssemblyReady({ scheduledAt: '2026-11-03T09:00:00.000Z', invitationAt: '2026-10-01' })).toBe(true);
  });

  it('warnt ab 1. Oktober, solange die Jahresversammlung weder terminiert noch durchgeführt ist', () => {
    const now = new Date('2026-10-01T08:00:00.000Z');
    expect(shouldWarnAboutAnnualAssembly([], 2026, now)).toBe(true);
    expect(shouldWarnAboutAnnualAssembly([{ year: 2026, scheduledAt: '2026-11-03T09:00:00.000Z', status: 'draft' }], 2026, now)).toBe(false);
    expect(shouldWarnAboutAnnualAssembly([{ year: 2026, status: 'held' }], 2026, now)).toBe(false);
  });
});
