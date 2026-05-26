import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/features/knowledge/KnowledgePanels.tsx', 'utf8');

describe('P15o knowledge accessibility select names', () => {
  it('gives the knowledge source filter an accessible name for Axe select-name', () => {
    expect(source).toContain('aria-label="Quelle der Wissenssuche"');
    expect(source).toContain('className="industrial-select" value={source}');
  });

  it('gives the case-link select an accessible name for Axe select-name', () => {
    expect(source).toContain('aria-label="Fallakte für Rechtsbezug auswählen"');
    expect(source).toContain('className="industrial-select" value={linkCaseId}');
  });
});
