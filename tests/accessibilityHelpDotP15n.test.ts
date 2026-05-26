import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const helpDotFiles = [
  'src/app/features/prevention/PreventionView.tsx',
  'src/app/features/persons/PersonLifecycleReviewDialog.tsx'
];

describe('P15n help-dot accessibility contract', () => {
  it('does not put aria-label on role-less industrial help dots', () => {
    for (const relativePath of helpDotFiles) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      const helpDotTags = [...source.matchAll(/<span[^>]*className="industrial-help-dot"[^>]*>/g)].map((match) => match[0]);

      expect(helpDotTags.length, `${relativePath} enthält Help-Dot-Markup`).toBeGreaterThan(0);
      for (const tag of helpDotTags) {
        if (!tag.includes('aria-label=')) continue;
        expect(tag, `${relativePath}: aria-label auf Help-Dot braucht eine gültige Rolle für Axe/WCAG 4.1.2`).toContain('role="img"');
      }
    }
  });
});
