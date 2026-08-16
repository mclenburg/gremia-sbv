import { describe, expect, it } from 'vitest';
import { indexOfPattern, normalizeSourceText } from '../../helpers/sourceText';

describe('plattformunabhängige Normalisierung unvermeidbarer Textartefakte', () => {
  it('normalisiert CRLF und einzelne CR deterministisch auf LF', () => {
    expect(normalizeSourceText('eins\r\nzwei\rdrei\nvier')).toBe('eins\nzwei\ndrei\nvier');
  });

  it('wendet auch Pattern-Suchen auf normalisierten Text an', () => {
    expect(indexOfPattern('eins\r\nzwei', /\nzwei/)).toBe(4);
  });
});
