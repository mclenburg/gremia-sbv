import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/ui/responsiveDesign.css', 'utf8');
const view = readFileSync('src/app/features/participation/ParticipationView.tsx', 'utf8');
const moduleCss = readFileSync('src/app/features/participation/participationWorkbench.css', 'utf8');

describe('0.8.5-b Workbench layout master', () => {
  it('provides central workbench and form layout rules', () => {
    expect(css).toContain('.workbench-summary');
    expect(css).toContain('.workbench-grid');
    expect(css).toContain('.workbench-detail-panel');
    expect(css).toContain('.industrial-form-grid');
    expect(css).toContain('.industrial-field');
    expect(css).toContain('grid-template-columns: repeat(auto-fit');
  });

  it('uses the shared layout master in the participation module', () => {
    expect(view).toContain("../../shared/components/WorkbenchLayout");
    expect(view).toContain('<WorkbenchSummary');
    expect(view).toContain('<WorkbenchGrid>');
    expect(view).toContain('<WorkbenchListPanel');
    expect(view).toContain('<WorkbenchDetailPanel');
    expect(view).toContain('<IndustrialFormGrid');
    expect(view).toContain('<IndustrialField');
  });

  it('keeps participation css feature-specific instead of owning the full layout', () => {
    expect(moduleCss).not.toContain('.participation-toolbar');
    expect(moduleCss).not.toContain('.participation-grid');
    expect(moduleCss).not.toContain('.participation-create-panel');
    expect(moduleCss).toContain('.participation-check-matrix');
  });
});
