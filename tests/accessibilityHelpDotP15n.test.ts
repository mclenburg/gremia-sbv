import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const legacyHelpDotFiles = [
  'src/app/features/persons/PersonLifecycleReviewDialog.tsx',
];

const industrialHelpButtonFiles = [
  'src/app/features/bem/BemView.tsx',
  'src/app/features/prevention/PreventionView.tsx',
];

describe('P15n help-dot accessibility contract', () => {
  it('does not put aria-label on role-less legacy industrial help dots', () => {
    for (const relativePath of legacyHelpDotFiles) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      const helpDotTags = [...source.matchAll(/<span[^>]*className="industrial-help-dot"[^>]*>/g)].map((match) => match[0]);

      expect(helpDotTags.length, `${relativePath} enthält Legacy-Help-Dot-Markup`).toBeGreaterThan(0);
      for (const tag of helpDotTags) {
        if (!tag.includes('aria-label=')) continue;
        expect(tag, `${relativePath}: aria-label auf Help-Dot braucht eine gültige Rolle für Axe/WCAG 4.1.2`).toContain('role="img"');
      }
    }
  });

  it('keeps migrated module help actions on IndustrialHelpButton instead of legacy help dots', () => {
    for (const relativePath of industrialHelpButtonFiles) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      expect(source, `${relativePath} nutzt den zentralen IndustrialHelpButton`).toContain('IndustrialHelpButton');
      expect(source, `${relativePath} nutzt keinen Legacy-Help-Dot mehr`).not.toContain('industrial-help-dot');
    }
  });
});
