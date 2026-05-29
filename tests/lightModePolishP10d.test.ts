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

describe('light mode polish P10D', () => {
  it('brueckt Legacy-Farbvariablen auf zentrale Industrial-Tokens', () => {
    expect(css).toContain('--surface-base: var(--industrial-bg');
    expect(css).toContain('--panel-muted: color-mix');
    expect(css).toContain('--text-primary: var(--industrial-text');
    expect(css).toContain('--border-muted: var(--industrial-border');
  });

  it('setzt Light-Mode-Subpanels und zentrale Karten auf helle Flaechen statt dunkle Fallbacks', () => {
    expect(css).toContain("html[data-theme='light'] .industrial-subpanel");
    expect(css).toContain("html[data-theme='light'] .industrial-record-card");
    expect(css).toContain("html[data-theme='light'] .industrial-status-card");
    expect(css).toContain('background-color: #fafaf5;');
    expect(css).toContain('background-image: linear-gradient(135deg, rgba(250, 250, 245, 0.96), rgba(225, 224, 214, 0.98))');
  });

  it('haelt Knowledge-Texte und Formularfelder im Light-Mode kontrastreich lesbar', () => {
    expect(css).toContain("html[data-theme='light'] .knowledge-register-row small");
    expect(css).toContain("html[data-theme='light'] .knowledge-case-link summary");
    expect(css).toContain("html[data-theme='light'] .industrial-settings-form textarea");
    expect(css).toContain('color: var(--text-primary)');
    expect(css).toContain('color: #6a6a60');
  });
});
