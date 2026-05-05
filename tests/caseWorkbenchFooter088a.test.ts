import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const component = readFileSync('src/app/features/cases/CaseWorkbenchFooter.tsx', 'utf8');
const css = readFileSync('src/app/caseWorkbench.css', 'utf8');

describe('case workbench footer polish 0.8.8-a', () => {
  it('separates quick actions from measure actions', () => {
    expect(component).toContain('Schnellerfassung');
    expect(component).toContain('Maßnahmen');
    expect(component).toContain('case-workbench-footer-actions-primary');
    expect(component).toContain('case-workbench-footer-actions-secondary');
  });

  it('keeps measure actions visually calmer than primary actions', () => {
    expect(component).toContain('industrial-secondary-button case-workbench-footer-button case-workbench-footer-button-secondary');
    expect(css).toContain('.case-workbench-footer-button-secondary');
  });
});
