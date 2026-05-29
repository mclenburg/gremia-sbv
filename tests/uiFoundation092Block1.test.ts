import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { IndustrialFieldOption } from '../src/app/shared/components/IndustrialForm';

type UiFoundationBlock1Subject = IndustrialFieldOption;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function sourcesUnder(dir: string): Array<{ path: string; text: string }> {
  const files: Array<{ path: string; text: string }> = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) {
        visit(child);
      } else if (child.endsWith('.ts') || child.endsWith('.tsx')) {
        files.push({ path: child, text: source(child) });
      }
    }
  }
  visit(dir);
  return files;
}

describe('UI-Fundament Block 1', () => {
  it('stellt Design-Tokens vor dem responsiven App-Chrome bereit', () => {
    const app = source('src/app/App.tsx');
    const tokens = source('src/app/ui/designTokens.css');

    expect(app.indexOf('./ui/designTokens.css')).toBeGreaterThan(-1);
    expect(app.indexOf('./ui/designTokens.css')).toBeLessThan(app.indexOf('./ui/responsiveDesign.css'));

    for (const token of [
      '--industrial-control-bg',
      '--industrial-control-bg-hover',
      '--industrial-control-border-focus',
      '--industrial-textarea-min-height',
      '--industrial-select-option-bg',
    ]) {
      expect(tokens).toContain(token);
    }

    expect(tokens).toContain("html[data-theme='light']");
  });

  it('trennt Textfelder, Textareas und Selects im zentralen Formular-Chrome', () => {
    const form = source('src/app/shared/components/IndustrialForm.tsx');
    const css = `${source('src/app/ui/forms.css')}\n${source('src/app/ui/responsiveDesign.css')}`;

    expect(form).toContain('industrial-input industrial-text-input');
    expect(form).toContain('industrial-input industrial-textarea-input');
    expect(form).toContain('industrial-input industrial-select industrial-select-input');
    expect(form).toContain('FormErrorSummary');

    for (const selector of [
      '.industrial-text-input',
      '.industrial-textarea-input',
      '.industrial-select-input',
      '.industrial-form-error-summary',
    ]) {
      expect(css).toContain(selector);
    }

    expect(css).toContain('min-height: var(--industrial-textarea-min-height)');
    expect(css).toContain('resize: vertical');
  });

  it('verhindert die alte sekundäre Button-Doppelklasse in produktiven Quellen', () => {
    const offenders = sourcesUnder('src/app')
      .filter(({ text }) => text.includes('industrial-button industrial-button-secondary') || text.includes('industrial-button industrial-button-danger'))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it('nutzt zentrale Button-Wrapper fuer Gremia.BR- und Beteiligungsaktionen', () => {
    const dashboardFocus = source('src/app/features/dashboard/DashboardFocusOverview.tsx');
    const dashboardPanel = source('src/app/features/dashboard/GremiaBrDashboardPanel.tsx');
    const settings = source('src/app/features/settings/GremiaBrSettingsPanel.tsx');
    const participation = source('src/app/features/participation/ParticipationProcessDetail.tsx');

    expect(dashboardFocus).toContain('ToolbarButton');
    expect(dashboardPanel).toContain('ToolbarButton');
    expect(settings).toContain('IndustrialButton');
    expect(settings).toContain('ToolbarButton');
    expect(settings).toContain('DangerButton');
    expect(participation).toContain('ToolbarButton');
  });
});
