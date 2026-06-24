import { describe, expect, it } from 'vitest';
import { buildFromContext } from '../services/activityJournalPrefill';

describe('Tätigkeitsjournal BEM-Prefill 0.9.3-a', () => {
  it('verknüpft BEM-Kontexte mit Prozess und Fall ohne medizinische Detailübernahme', () => {
    const prefill = buildFromContext({
      contextType: 'bem_process',
      contextId: 'bem-1',
      caseId: 'case-1',
      title: 'BEM wegen Diagnose X',
    });

    expect(prefill.entry.category).toBe('bem_preparation');
    expect(prefill.entry.title).toBe('BEM-Begleitung: Gespräch vorbereitet');
    expect(prefill.entry.links).toEqual([
      { targetType: 'bem_process', targetId: 'bem-1' },
      { targetType: 'case', targetId: 'case-1' },
    ]);
    expect(prefill.entry.title).not.toContain('Diagnose');
  });
});
