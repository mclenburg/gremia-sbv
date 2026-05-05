import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const footer = readFileSync('src/app/features/cases/CaseWorkbenchFooter.tsx', 'utf8');
const detailPanel = readFileSync('src/app/features/cases/CaseDetailPanel.tsx', 'utf8');
const css = readFileSync('src/app/caseWorkbench.css', 'utf8');
const cleanupManifest = readFileSync('maintenance/source-cleanup/obsolete-files-0.8.8-b.json', 'utf8');

describe('0.8.8-b case workbench responsive polish', () => {
  it('keeps the action footer grouped instead of rendering a flat button wall', () => {
    expect(footer).toContain('Schnellerfassung');
    expect(footer).toContain('Maßnahmen');
    expect(footer).toContain('case-workbench-footer-actions-primary');
    expect(footer).toContain('case-workbench-footer-actions-secondary');
  });

  it('uses a quieter secondary style for measure actions', () => {
    expect(footer).toContain('industrial-secondary-button case-workbench-footer-button');
    expect(css).toContain('.case-workbench-footer-actions-secondary');
    expect(css).toContain('.case-workbench-footer-button-secondary');
  });

  it('keeps footer and search responsive with auto-fit and narrow-width fallbacks', () => {
    expect(css).toContain('repeat(auto-fit, minmax(13rem, 1fr))');
    expect(css).toContain('repeat(auto-fit, minmax(10.75rem, 1fr))');
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('@media (max-width: 560px)');
    expect(detailPanel).toContain('case-detail-search-bar');
    expect(detailPanel).toContain('case-detail-search-button');
  });

  it('documents cleanup of obsolete layout policy tests', () => {
    expect(cleanupManifest).toContain('caseWorkbenchLayoutPolicy.test.ts');
    expect(cleanupManifest).toContain('caseWorkbenchDensityPolicy.test.ts');
    expect(cleanupManifest).toContain('caseCreateModalScroll061.test.ts');
  });
});
