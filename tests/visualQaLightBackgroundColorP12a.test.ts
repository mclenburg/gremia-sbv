import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const uiCssFiles = [
  'src/app/ui/designTokens.css',
  'src/app/ui/base.css',
  'src/app/ui/appShell.css',
  'src/app/ui/components.css',
  'src/app/ui/workbench.css',
  'src/app/ui/processes.css',
  'src/app/ui/featureModules.css',
  'src/app/ui/responsiveDesign.css',
  'src/app/ui/forms.css',
];
const css = uiCssFiles
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

describe('visual qa light background colors P12A', () => {
  it('setzt fuer Light-Mode-Flaechen eine echte background-color statt nur ein Gradient-Image', () => {
    expect(css).toContain("html[data-theme='light'] .industrial-empty-state");
    expect(css).toContain("html[data-theme='light'] .text-command-help-modal");
    expect(css).toContain("html[data-theme='light'] .text-command-help-group");
    expect(css).toContain('/* P12A: Visual-QA misst background-color; Light-Mode-Flächen dürfen nicht nur ein Gradient-Image haben. */');
    expect(css).toContain('background-color: #fafaf5;');
  });

  it('bewahrt die sichtbare Light-Mode-Industrial-Tiefe ueber background-image statt background-shorthand', () => {
    expect(css).toContain('background-image: linear-gradient(135deg, rgba(250, 250, 245, 0.96), rgba(225, 224, 214, 0.98))');
    expect(css).toContain('background-image: linear-gradient(135deg, rgba(250, 250, 245, 0.98), rgba(228, 227, 216, 0.99))');
    expect(css).toContain('background-image: linear-gradient(135deg, rgba(250, 250, 245, 0.9), rgba(238, 237, 226, 0.92))');
  });
});
