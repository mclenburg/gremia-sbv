import { describe, expect, it } from 'vitest';
import { REMOVED_FREETEXT_PREFIX, replaceFreeTextPreservingLength } from '../../services/caseAnonymizationPolicy';

describe('case anonymization free-text replacement', () => {
  it('keeps the full removal notice when the original text is shorter', () => {
    expect(replaceFreeTextPreservingLength('kurz')).toBe(REMOVED_FREETEXT_PREFIX);
  });

  it('preserves the exact original length for longer free text and never keeps original content', () => {
    const original = 'Max Mustermann besprach mit der SBV einen sehr ausführlichen personenbezogenen Sachverhalt, der vollständig entfernt werden soll.';
    const result = replaceFreeTextPreservingLength(original);
    expect(result.startsWith(REMOVED_FREETEXT_PREFIX)).toBe(true);
    expect(result).toHaveLength(original.length);
    expect(result).not.toContain('Max Mustermann');
    expect(result).toContain('Lorem ipsum');
  });

  it('keeps empty fields empty', () => {
    expect(replaceFreeTextPreservingLength('')).toBe('');
  });
});
