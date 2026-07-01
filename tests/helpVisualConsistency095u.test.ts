import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('0.9.5-x Help- und Badge-Visual-Konsistenz', () => {
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

  it('rendert Bereichshilfen im BEM-/Kündigungsstil und verhindert blaue Hilfe-Akzente', () => {
    const css = read('src/app/ui/components.css');
    const helpBlock = css.slice(css.indexOf('.industrial-help-button {'), css.indexOf('.industrial-help-inline {'));

    expect(helpBlock).toContain('min-height: 36px');
    expect(helpBlock).toContain('padding: 8px 10px');
    expect(helpBlock).toContain('background: rgba(9, 9, 11, 0.84);');
    expect(helpBlock).toContain('text-transform: uppercase');
    expect(helpBlock).toContain('var(--industrial-accent)');
    expect(helpBlock).not.toContain('59, 130, 246');
    expect(helpBlock).not.toContain('30, 64, 175');
    expect(helpBlock).not.toContain('239, 246, 255');
  });

  it('haelt Feldhilfe kompakt, aber im selben Farbsystem', () => {
    const css = read('src/app/ui/components.css');
    const component = read('src/app/shared/help/IndustrialHelp.tsx');

    expect(component).toContain("const compactMode = compact ?? label === 'Feldhilfe öffnen'");
    expect(component).toContain('industrial-help-button-text');
    expect(component).toContain('Hilfe');
    expect(css).toContain('.industrial-help-button.is-compact');
    expect(css).toContain('.industrial-help-dot');
    expect(css).toContain('width: 28px');
    expect(css).toContain('background: #eeeeea;');
    expect(css).toContain('width: 0.85rem');
  });
});
