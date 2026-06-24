import { describe, expect, it } from 'vitest';
import { buildFromContext } from '../services/activityJournalPrefill';

describe('Tätigkeitsjournal Beteiligungs-Prefill 0.9.3-a', () => {
  it('unterscheidet Beteiligung und Kündigungsanhörung bei gleichem Kategorienzweck', () => {
    const participation = buildFromContext({ contextType: 'sbv_participation', contextId: 'part-1' });
    const termination = buildFromContext({ contextType: 'termination_hearing', contextId: 'term-1' });

    expect(participation.entry.category).toBe('participation');
    expect(participation.entry.title).toBe('Beteiligung: Stellungnahme vorbereitet');
    expect(termination.entry.category).toBe('participation');
    expect(termination.entry.title).toBe('Kündigungsanhörung: Unterlagen geprüft');
  });
});
