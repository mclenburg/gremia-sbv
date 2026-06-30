import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('0.9.5-u Help- und Badge-Visual-Konsistenz', () => {
  it('nutzt in BEM und Prävention den zentralen IndustrialHelpButton statt Sonderbuttons', () => {
    const bem = read('src/app/features/bem/BemView.tsx');
    const prevention = read('src/app/features/prevention/PreventionView.tsx');

    expect(bem).toContain('IndustrialHelpButton');
    expect(bem).not.toContain('setShowHelp');
    expect(bem).not.toContain('ToolbarButton onClick={() => setShowHelp');

    expect(prevention).toContain('IndustrialHelpButton');
    expect(prevention).not.toContain('industrial-help-dot');
    expect(prevention).not.toContain('function StepTooltip');
  });

  it('registriert zentrale Hilfeeinträge für BEM und Prävention', () => {
    const registry = read('src/app/shared/help/helpRegistry.ts');

    expect(registry).toContain('"bem.overview"');
    expect(registry).toContain('"prevention.overview"');
  });

  it('stellt lesbare Personenstatus-Badges im Light-Mode bereit', () => {
    const css = read('src/app/ui/featureModules.css');

    expect(css).toContain("html[data-theme='light'] .person-lifecycle-badge.ok");
    expect(css).toContain('color: #14532d');
    expect(css).toContain("html[data-theme='light'] .person-lifecycle-badge.warning");
    expect(css).toContain("html[data-theme='light'] .person-lifecycle-badge.critical");
  });
});
