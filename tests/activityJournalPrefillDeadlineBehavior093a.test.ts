import { describe, expect, it } from 'vitest';
import { buildFromDeadline } from '../services/activityJournalPrefill';

describe('Tätigkeitsjournal Fristen-Prefill 0.9.3-a', () => {
  it('macht aus Fristen nur eine schreibfreie Journal-Vorlage', () => {
    const prefill = buildFromDeadline({ id: 'deadline-1', title: 'Rückmeldung HR prüfen', caseId: 'case-1' });

    expect(prefill.entry.category).toBe('documentation');
    expect(prefill.entry.status).toBe('final');
    expect(prefill.entry.links).toEqual([
      { targetType: 'deadline', targetId: 'deadline-1' },
      { targetType: 'case', targetId: 'case-1' },
    ]);
  });
});
