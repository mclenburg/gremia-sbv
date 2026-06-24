import { describe, expect, it } from 'vitest';
import { buildFromContext } from '../services/activityJournalPrefill';

describe('Tätigkeitsjournal Fall-Prefill 0.9.3-a', () => {
  it('befüllt Fallkontexte datensparsam mit Fallnummer statt Klarname', () => {
    const prefill = buildFromContext({
      contextType: 'case',
      contextId: 'case-1',
      caseNumber: 'SBV-2026-004',
      title: 'Kollegin Beispiel',
    });

    expect(prefill.entry.category).toBe('case_work');
    expect(prefill.entry.title).toBe('SBV-2026-004: Tätigkeit dokumentiert');
    expect(prefill.entry.links).toEqual([{ targetType: 'case', targetId: 'case-1' }]);
    expect(prefill.privacyNotice).toMatch(/noch kein Journaleintrag gespeichert/);
  });
});
