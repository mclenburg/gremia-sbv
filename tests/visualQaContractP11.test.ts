import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  VISUAL_QA_ROUTES,
  VISUAL_QA_CONTROL_SELECTORS,
  isDarkModeLightLeak,
  isLightModeDarkFallback,
  isReadableSurfaceContrast,
  isRoundedLegacyPill,
  type VisualSurfaceSample,
} from '../src/app/shared/theme/visualQa';

function sample(partial: Partial<VisualSurfaceSample>): VisualSurfaceSample {
  return {
    selector: '.industrial-card',
    backgroundLuminance: 220,
    textLuminance: 30,
    area: 12_000,
    ...partial,
  };
}

describe('P11 visual QA contract', () => {
  it('covers the complete primary navigation matrix including settings', () => {
    expect(VISUAL_QA_ROUTES.map((route) => route.id)).toEqual([
      'dashboard',
      'persons',
      'cases',
      'deadlines',
      'bem',
      'prevention',
      'participation',
      'workplace_accommodation',
      'equalization',
      'termination_hearing',
      'templates',
      'knowledge',
      'contacts',
      'compliance',
      'sbv_control',
      'reports',
      'settings',
    ]);
  });

  it('detects dark fallback panels in light mode without flagging small icons', () => {
    expect(isLightModeDarkFallback(sample({ backgroundLuminance: 80, area: 20_000 }))).toBe(true);
    expect(isLightModeDarkFallback(sample({ backgroundLuminance: 215, area: 20_000 }))).toBe(false);
    expect(isLightModeDarkFallback(sample({ backgroundLuminance: 80, area: 600 }))).toBe(false);
  });

  it('detects light surface leaks in dark mode without rejecting normal dark panels', () => {
    expect(isDarkModeLightLeak(sample({ backgroundLuminance: 245, area: 12_000 }))).toBe(true);
    expect(isDarkModeLightLeak(sample({ backgroundLuminance: 36, area: 12_000 }))).toBe(false);
  });

  it('rejects legacy pill radii while allowing central control-radius values', () => {
    expect(isRoundedLegacyPill(999)).toBe(true);
    expect(isRoundedLegacyPill(16)).toBe(true);
    expect(isRoundedLegacyPill(4)).toBe(false);
    expect(isRoundedLegacyPill(0)).toBe(false);
  });

  it('checks luminance contrast as behavior instead of screenshot snapshots', () => {
    expect(isReadableSurfaceContrast(sample({ backgroundLuminance: 235, textLuminance: 28 }))).toBe(true);
    expect(isReadableSurfaceContrast(sample({ backgroundLuminance: 128, textLuminance: 117 }))).toBe(false);
  });

  it('bindet alle nativen Modal-Controls an den zentralen Industrial-Formular-Chrome', () => {
    const formsCss = readFileSync('src/app/ui/forms.css', 'utf8');

    for (const selector of [
      '.industrial-modal input:not([type="checkbox"]):not([type="radio"])',
      '.industrial-modal select',
      '.industrial-modal textarea',
    ]) {
      expect(formsCss).toContain(selector);
      expect(VISUAL_QA_CONTROL_SELECTORS).toContain(selector);
    }

    expect(formsCss).toContain('background: var(--industrial-control-bg);');
    expect(formsCss).toContain('border: 1px solid var(--industrial-control-border);');
    expect(formsCss).toContain("html[data-theme='light'] .industrial-modal textarea");
  });
});
