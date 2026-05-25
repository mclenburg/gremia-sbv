import { describe, expect, it } from 'vitest';
import {
  VISUAL_QA_ROUTES,
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
});
