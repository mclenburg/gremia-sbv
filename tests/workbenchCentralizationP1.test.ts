import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function featureSources(dir: string): string {
  const chunks: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) {
        visit(child);
      } else if (child.endsWith('.ts') || child.endsWith('.tsx')) {
        chunks.push(source(child));
      }
    }
  }
  visit(dir);
  return chunks.join('\n');
}

describe('Workbench-Zentralisierung Patch P1', () => {
  it('stellt die verbindlichen Workbench-Grundbausteine zentral bereit', () => {
    const layout = source('src/app/shared/components/WorkbenchLayout.tsx');
    const css = source('src/app/ui/responsiveDesign.css');

    for (const component of ['WorkbenchPage', 'WorkbenchHeader', 'WorkbenchSidebar', 'WorkbenchContent', 'WorkbenchToolbar']) {
      expect(layout).toContain(`function ${component}`);
    }

    for (const selector of ['.workbench-page', '.workbench-header', '.workbench-sidebar', '.workbench-content', '.workbench-toolbar']) {
      expect(css).toContain(selector);
    }
  });

  it('zieht Compliance und SBV-Steuerung auf die zentrale Workbench-Struktur statt lokaler Shells', () => {
    const compliance = featureSources('src/app/features/compliance');
    const sbvControl = source('src/app/features/sbv-control/SbvControlView.tsx');

    expect(compliance).toContain('WorkbenchPage');
    expect(compliance).toContain('WorkbenchWorkspace');
    expect(compliance).toContain('WorkbenchToolbar');
    expect(compliance).not.toContain('<ModuleFrame');

    expect(sbvControl).toContain('WorkbenchPage');
    expect(sbvControl).toContain('WorkbenchWorkspace');
    expect(sbvControl).toContain('WorkbenchNavigation');
    expect(sbvControl).not.toContain('sbv-control-shell');
    expect(sbvControl).not.toContain('sbv-control-tabs');
  });
});
