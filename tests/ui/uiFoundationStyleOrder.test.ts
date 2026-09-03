import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { IndustrialFieldOption } from '../../src/app/shared/components/IndustrialForm';

type UiFoundationBlock2Subject = IndustrialFieldOption;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function importIndex(app: string, specifier: string): number {
  return app.indexOf(`import "${specifier}";`);
}

function topLevelRuleHeads(css: string): string[] {
  const heads: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') {
      if (depth === 0) {
        heads.push(css.slice(start, index).trim());
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        start = index + 1;
      }
    }
  }

  return heads.filter(Boolean);
}

function uiCss(): string {
  return [
    'src/app/ui/designTokens.css',
    'src/app/ui/base.css',
    'src/app/ui/appShell.css',
    'src/app/ui/components.css',
    'src/app/ui/modal.css',
    'src/app/ui/workbench.css',
    'src/app/ui/forms.css',
    'src/app/ui/processes.css',
    'src/app/ui/featureModules.css',
    'src/app/ui/responsiveDesign.css',
  ]
    .map((file) => source(file))
    .join('\n');
}

describe('UI-Fundament Block 2', () => {
  it('laedt die vollstaendig strukturierten UI-Styles in stabiler Kaskaden-Reihenfolge', () => {
    const app = source('src/app/appStyles.ts');
    const order = [
      './ui/designTokens.css',
      './ui/base.css',
      './ui/appShell.css',
      './ui/components.css',
      './ui/modal.css',
      './ui/workbench.css',
      './ui/forms.css',
      './ui/processes.css',
      './ui/featureModules.css',
      './ui/responsiveDesign.css',
    ];

    const indexes = order.map((specifier) => importIndex(app, specifier));
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it('trennt Basis, Shell, Komponenten, Workbench, Prozesse, Features und Formular-Chrome aus der Responsive-Ebene', () => {
    const base = source('src/app/ui/base.css');
    const shell = source('src/app/ui/appShell.css');
    const components = source('src/app/ui/components.css');
    const workbench = source('src/app/ui/workbench.css');
    const forms = source('src/app/ui/forms.css');
    const processes = source('src/app/ui/processes.css');
    const features = source('src/app/ui/featureModules.css');
    const responsive = source('src/app/ui/responsiveDesign.css');

    expect(base).toContain(['button,', 'input,', 'select,', 'textarea'].join('\n'));
    expect(shell).toContain('.industrial-shell');
    expect(shell).toContain('.industrial-content');
    expect(components).toContain('.industrial-button');
    expect(components).toContain('.industrial-warning-panel');
    expect(components).toContain('.industrial-dashboard-card');
    expect(workbench).toContain('.workbench-page');
    expect(workbench).toContain('.industrial-field');
    expect(forms).toContain('.industrial-textarea-input');
    expect(forms).toContain('.industrial-form-error-summary');
    expect(processes).toContain('.case-process-header');
    expect(processes).toContain('.prevention-status-section');
    expect(features).toContain('.person-list-item');

    expect(topLevelRuleHeads(responsive).every((head) => head.startsWith('@media'))).toBe(true);
    expect(topLevelRuleHeads(responsive).some((head) => head === ':root')).toBe(false);
  });

  it('wendet den harten Industrial-Eckenvertrag in der zentralen UI-CSS-Basis konsequent an', () => {
    const css = uiCss();
    const radiusDeclarations = Array.from(css.matchAll(/border-radius:\s*([^;]+);/g)).map(
      (match) => match[1].trim(),
    );

    expect(radiusDeclarations.length).toBeGreaterThan(0);
    expect(radiusDeclarations.every((value) => (
      value === '0' ||
      value === '50%' ||
      value === 'var(--control-radius)' ||
      value === 'var(--industrial-control-radius)' ||
      value === 'var(--industrial-corner-radius)'
    ))).toBe(true);
    expect(css.replace(/border-radius:\s*50%;/g, '')).not.toMatch(/border-radius:\s*(?:0\.[1-9]|[1-9]|\.[1-9])/);
    expect(css).toContain('--control-radius: 0;');
    expect(css).toContain('--industrial-corner-radius: 0;');
  });

  it('gibt Icon-Aktionen einen eindeutigen Zeiger- und Hoverzustand', () => {
    const components = source('src/app/ui/components.css');
    const features = source('src/app/ui/featureModules.css');
    expect(components).toMatch(/\.industrial-icon-button\s*\{[\s\S]*?cursor:\s*pointer;/);
    expect(components).toContain('.industrial-icon-button:hover:not(:disabled)');
    expect(features).toMatch(/\.privacy-destructive-action\s*\{[\s\S]*?cursor:\s*pointer;/);
    expect(features).toContain('.privacy-destructive-action:hover:not(:disabled)');
    expect(features).toContain('.case-tree-process-delete {');
    expect(features).toContain('.case-register-privacy-action {');
  });

  it('bewahrt Basis-Chrome fuer Navigation, Fallbaum und Fallaktensuche', () => {
    const components = source('src/app/ui/components.css');
    const workbench = source('src/app/ui/workbench.css');
    const features = source('src/app/ui/featureModules.css');
    const responsive = source('src/app/ui/responsiveDesign.css');

    expect(components).toMatch(/\.industrial-nav button,\s*\.industrial-lock-button\s*\{[\s\S]*?background:\s*transparent;/);
    expect(components).toMatch(/\.industrial-nav button,\s*\.industrial-lock-button\s*\{[\s\S]*?cursor:\s*pointer;/);
    expect(components).toContain('.industrial-nav button:hover:not(:disabled)');
    expect(workbench).toMatch(/\.case-workbench\s*\{[\s\S]*?display:\s*grid;/);
    expect(workbench).toMatch(/\.case-workbench\s*\{[\s\S]*?grid-template-columns:/);
    expect(features).toMatch(/\.case-tree-node\s*\{[\s\S]*?background:\s*rgba\(9, 9, 11, 0\.54\);/);
    expect(features).toMatch(/\.case-tree-node\s*\{[\s\S]*?cursor:\s*pointer;/);
    expect(features).toMatch(/\.case-search-result\s*\{[\s\S]*?cursor:\s*pointer;/);
    expect(features).toContain('.case-tree-node:hover:not(:disabled)');
    expect(features).toContain('.case-search-result:hover:not(:disabled)');
    expect(responsive).toMatch(/@media \(max-width: 1180px\)\s*\{[\s\S]*?\.case-workbench\s*\{/);
    expect(responsive).not.toMatch(/@media \(max-width: 1500px\)\s*\{[\s\S]*?\.case-workbench\s*\{/);
  });

  it('stylt Privacy-Lifecycle-Auswahllisten in Dark- und Light-Mode lesbar und fokussierbar', () => {
    const forms = source('src/app/ui/forms.css');
    expect(forms).toContain('.privacy-review-form select:focus-visible');
    expect(forms).toContain('.industrial-select:focus-visible');
    expect(forms).toContain('.privacy-review-form select:hover');
    expect(forms).toContain('.privacy-review-form select option');
    expect(forms).toContain("html[data-theme='light'] .privacy-review-form select");
    expect(forms).toContain("html[data-theme='light'] .privacy-review-form select option");
    expect(forms).toContain('background-color: var(--industrial-select-bg);');
    expect(forms).toContain('background: var(--industrial-select-option-bg);');
    expect(forms).toContain('color: var(--industrial-text-strong, #f4f4f5);');
  });

});
