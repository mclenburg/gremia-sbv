import { describe, expect, it } from 'vitest';
import { buildFromClosedJournalDeadline } from '../services/activityJournalPrefill';

describe('Tätigkeitsjournal erledigte Wiedervorlage 0.9.3-a', () => {
  it('setzt erledigte Journal-Wiedervorlagen als Ergebnisdokumentation vor', () => {
    const prefill = buildFromClosedJournalDeadline({ id: 'deadline-1', title: 'Nachhaltung HR' });

    expect(prefill.entry.title).toBe('Journal-Wiedervorlage: Ergebnis dokumentiert');
    expect(prefill.entry.resultNote).toContain('Nachhaltung HR');
    expect(prefill.entry.links).toEqual([{ targetType: 'deadline', targetId: 'deadline-1' }]);
  });
});
