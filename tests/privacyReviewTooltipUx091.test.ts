import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dialogSource = readFileSync('src/app/features/persons/PersonLifecycleReviewDialog.tsx', 'utf8');

describe('Privacy Review Tooltip UX 0.9.1', () => {
  it('nutzt für Inline-Anonymisierung einen Tooltip statt langer UI-Hinweise', () => {
    expect(dialogSource).toContain('InlineAnonymizationHelp');
    expect(dialogSource).toContain('HelpCircle');
    expect(dialogSource).toContain('title={helpText}');
    expect(dialogSource).toContain('aria-label={helpText}');
    expect(dialogSource).not.toContain('indem auf <code>~~</code> der zu anonymisierende Inhalt folgt');
  });
});
