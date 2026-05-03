import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/caseWorkbench.css', 'utf8');

describe('case workbench layout policy', () => {
  it('keeps the case workbench split into a tree and a flexible detail panel', () => {
    expect(css).toContain('.case-workbench');
    expect(css).toContain('grid-template-columns: minmax(18rem, 22rem) minmax(0, 1fr)');
  });

  it('prevents prevention and note forms from overflowing horizontally', () => {
    expect(css).toContain('.case-detail-inline-form .industrial-form-grid');
    expect(css).toContain('repeat(auto-fit, minmax(15rem, 1fr))');
    expect(css).toContain('box-sizing: border-box');
  });

  it('keeps register actions and search responsive', () => {
    expect(css).toContain('.case-register-actions');
    expect(css).toContain('.case-search-bar');
    expect(css).toContain('@media (max-width: 1250px)');
  });
});
