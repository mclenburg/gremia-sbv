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

describe('text command help light polish P10F', () => {
  it('haelt den Kurzbefehle-Dialog kantig und in der zentralen Industrial-Sprache', () => {
    expect(css).toContain('.text-command-help-modal {');
    expect(css).toContain('.text-command-help-group {');
    expect(css).toContain('.text-command-help-item {');
    expect(css).toContain('.text-command-help-search input {');
    expect(css).toContain('/* P10F: Light-Mode-Selektoren behalten ebenfalls die harte Kante. */');
    expect(css).toContain("html[data-theme='light'] .text-command-help-item,");
    expect(css).toContain('border-radius: 0;');
  });

  it('setzt Gruppen, Eintraege und Suchfeld auf Token-Farben statt alte dunkelblaue Sonderfarben', () => {
    expect(css).toContain('background: var(--industrial-panel-muted)');
    expect(css).toContain('background: var(--industrial-card)');
    expect(css).toContain('background: var(--industrial-bg)');
    expect(css).toContain('color: var(--industrial-accent)');
  });

  it('enthaelt eigene Light-Mode-Regeln fuer den Kurzbefehle-Dialog und seine Karten', () => {
    expect(css).toContain("html[data-theme='light'] .text-command-help-modal");
    expect(css).toContain('background-color: #fafaf5;');
    expect(css).toContain('background-image: linear-gradient(135deg, rgba(250, 250, 245, 0.98), rgba(228, 227, 216, 0.99))');
    expect(css).toContain("html[data-theme='light'] .text-command-help-item");
    expect(css).toContain('background-image: linear-gradient(135deg, rgba(250, 250, 245, 0.9), rgba(238, 237, 226, 0.92))');
    expect(css).toContain("html[data-theme='light'] .text-command-help-search input");
    expect(css).toContain('color: var(--industrial-text)');
  });
});
