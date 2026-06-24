import { describe, expect, it } from 'vitest';
import { buildFromContext } from '../services/activityJournalPrefill';

describe('Tätigkeitsjournal Präventions-Prefill 0.9.3-a', () => {
  it('ordnet Präventionskontexte fachlich der Prävention zu', () => {
    const prefill = buildFromContext({ contextType: 'prevention_process', contextId: 'prev-1' });

    expect(prefill.entry.category).toBe('prevention');
    expect(prefill.entry.title).toBe('Prävention: Sachstand dokumentiert');
    expect(prefill.entry.createdFrom).toBe('context_prefill');
  });
});
