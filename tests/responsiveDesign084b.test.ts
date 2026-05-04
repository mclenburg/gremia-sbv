import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('0.8.4-b responsive Design- und Accessibility-Baseline', () => {
  const appSource = readFileSync(join(process.cwd(), 'src/app/App.tsx'), 'utf8');
  const navSource = readFileSync(join(process.cwd(), 'src/app/shell/ShellNav.tsx'), 'utf8');
  const moduleFrameSource = readFileSync(join(process.cwd(), 'src/app/shared/components/ModuleFrame.tsx'), 'utf8');
  const responsiveCss = readFileSync(join(process.cwd(), 'src/app/ui/responsiveDesign.css'), 'utf8');
  const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');

  it('bündelt wiederverwendbare Designwerte in einer zentralen UI-CSS-Basis', () => {
    expect(appSource).toContain("import './ui/responsiveDesign.css';");
    expect(responsiveCss).toContain('--layout-sidebar-width');
    expect(responsiveCss).toContain('--layout-page-padding');
    expect(responsiveCss).toContain('--control-min-height');
    expect(responsiveCss).toContain('--focus-ring');
  });

  it('macht die Shell responsiv statt nur links fixiert', () => {
    expect(responsiveCss).toContain('grid-template-columns: var(--layout-sidebar-width) minmax(0, 1fr)');
    expect(responsiveCss).toContain('@media (max-width: 1050px)');
    expect(responsiveCss).toContain('grid-auto-flow: column');
    expect(responsiveCss).toContain('overflow-x: auto');
    expect(responsiveCss).toContain('@media (max-width: 760px)');
  });

  it('stellt zentrale Accessibility-Basics bereit', () => {
    expect(appSource).toContain('className="skip-link"');
    expect(appSource).toContain('id="main-content"');
    expect(appSource).toContain('tabIndex={-1}');
    expect(navSource).toContain('aria-current');
    expect(navSource).toContain('type="button"');
    expect(responsiveCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(responsiveCss).toContain(':focus-visible');
  });

  it('vermeidet verschachtelte main-Landmarks in wiederverwendbaren Modulrahmen', () => {
    expect(moduleFrameSource).toContain('useId');
    expect(moduleFrameSource).toContain('aria-labelledby');
    expect(moduleFrameSource).toContain('<section className="module-frame"');
    expect(moduleFrameSource).not.toContain('<main className="module-frame"');
  });

  it('kennzeichnet den Patch als 0.8.4-b', () => {
    expect(packageJson).toContain('"version": "0.8.4-b"');
  });
});
