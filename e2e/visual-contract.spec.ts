import { test, expect } from './support/test';
import {
  VISUAL_QA_BADGE_SELECTORS,
  VISUAL_QA_CONTROL_SELECTORS,
  VISUAL_QA_ROUTES,
  VISUAL_QA_SURFACE_SELECTORS,
  isDarkModeLightLeak,
  isLightModeDarkFallback,
  isReadableSurfaceContrast,
  isRoundedLegacyPill,
  type VisualSurfaceSample,
  type VisualTheme,
} from '../src/app/shared/theme/visualQa';
import type { Page } from '@playwright/test';

function shortcutForHelp() {
  return process.platform === 'darwin' ? 'Meta+H' : 'Control+H';
}

async function setTheme(page: Page, theme: VisualTheme) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('gremia.sbv.theme', value);
    window.localStorage.setItem('gremia-sbv-theme', value);
    document.documentElement.dataset.theme = value;
  }, theme);
}

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openRoute(page: Page, navName: string) {
  await mainNavigation(page).getByRole('button', { name: navName, exact: true }).click();
}

type BrowserSurfaceSample = VisualSurfaceSample & {
  readonly text: string;
  readonly className: string;
};

type BrowserBadgeSample = {
  readonly text: string;
  readonly className: string;
  readonly radiusPx: number;
};

function visualProbeScript({ surfaceSelectors, badgeSelectors, controlSelectors }: { surfaceSelectors: string; badgeSelectors: string; controlSelectors: string }) {
  function parseRgb(value: string): [number, number, number] | null {
    const rgbMatch = value.match(/rgba?\(([-.\d]+),\s*([-.\d]+),\s*([-.\d]+)/i);
    if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];

    const srgbMatch = value.match(/color\(srgb\s+([-.\d]+)\s+([-.\d]+)\s+([-.\d]+)/i);
    if (srgbMatch) {
      return [Number(srgbMatch[1]), Number(srgbMatch[2]), Number(srgbMatch[3])].map((part) =>
        part <= 1 ? Math.round(part * 255) : part,
      ) as [number, number, number];
    }

    return null;
  }

  function luminance(value: string): number {
    const rgb = parseRgb(value);
    if (!rgb) return 0;
    return (rgb[0] * 0.2126) + (rgb[1] * 0.7152) + (rgb[2] * 0.0722);
  }

  function isTransparent(value: string): boolean {
    return value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || /rgba\([^)]*,\s*0\)/i.test(value);
  }

  function effectiveBackground(element: Element): string {
    let current: Element | null = element;
    while (current) {
      const color = getComputedStyle(current).backgroundColor;
      if (color && !isTransparent(color)) return color;
      current = current.parentElement;
    }
    const rootColor = getComputedStyle(document.documentElement).backgroundColor;
    if (rootColor && !isTransparent(rootColor)) return rootColor;
    return getComputedStyle(document.body).backgroundColor;
  }

  function isVisible(element: Element): boolean {
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function labelFor(element: Element): string {
    return (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 90);
  }

  function classNameFor(element: Element): string {
    const className = element.getAttribute('class') ?? '';
    return className.replace(/\s+/g, ' ').trim();
  }

  function collectSurfaces(selectors: string): BrowserSurfaceSample[] {
    return Array.from(document.querySelectorAll(selectors))
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector: selectors,
          backgroundLuminance: luminance(effectiveBackground(element)),
          textLuminance: luminance(style.color),
          area: Math.round(rect.width * rect.height),
          text: labelFor(element),
          className: classNameFor(element),
        };
      });
  }

  function collectBadges(selectors: string): BrowserBadgeSample[] {
    return Array.from(document.querySelectorAll(selectors))
      .filter(isVisible)
      .map((element) => {
        const style = getComputedStyle(element);
        const radiusValues = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]
          .map((radius) => Number.parseFloat(radius) || 0);
        return {
          text: labelFor(element),
          className: classNameFor(element),
          radiusPx: Math.max(...radiusValues),
        };
      });
  }

  return {
    surfaces: collectSurfaces(surfaceSelectors),
    controls: collectSurfaces(controlSelectors),
    badges: collectBadges(badgeSelectors),
  };
}

async function collectVisualSamples(page: Page) {
  return page.evaluate(visualProbeScript, {
    surfaceSelectors: VISUAL_QA_SURFACE_SELECTORS,
    badgeSelectors: VISUAL_QA_BADGE_SELECTORS,
    controlSelectors: VISUAL_QA_CONTROL_SELECTORS,
  });
}

test.describe('P11 visual contract across light and dark mode', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`keeps all primary work areas inside the ${theme} industrial visual contract`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/');

      for (const route of VISUAL_QA_ROUTES) {
        await openRoute(page, route.navName);
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();

        const samples = await collectVisualSamples(page);
        const surfaceViolations = samples.surfaces.filter((sample) =>
          theme === 'light' ? isLightModeDarkFallback(sample) : isDarkModeLightLeak(sample),
        );
        const contrastViolations = samples.surfaces.filter((sample) => !isReadableSurfaceContrast(sample));
        const badgeViolations = samples.badges.filter((sample) => isRoundedLegacyPill(sample.radiusPx));
        const controlViolations = theme === 'light'
          ? samples.controls.filter((sample) => sample.backgroundLuminance < 170 || !isReadableSurfaceContrast(sample, 38))
          : [];

        expect(
          surfaceViolations,
          `${theme}/${route.id}: keine dunklen Light-Mode-Restflächen und keine hellen Dark-Mode-Leaks`,
        ).toEqual([]);
        expect(contrastViolations, `${theme}/${route.id}: zentrale Flächen bleiben lesbar`).toEqual([]);
        expect(badgeViolations, `${theme}/${route.id}: keine runden Legacy-Pill-Badges`).toEqual([]);
        expect(controlViolations, `${theme}/${route.id}: Controls behalten Light-Mode-Industrial-Chrome`).toEqual([]);
      }
    });
  }

  test('keeps the inline shortcut help modal visually integrated in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.goto('/');
      await page.keyboard.press(shortcutForHelp());

      const dialog = page.getByRole('dialog', { name: /Kurzbefehle/i });
      await expect(dialog).toBeVisible();
      await expect(page.getByLabel(/Kurzbefehle durchsuchen/)).toBeFocused();

      const samples = await collectVisualSamples(page);
      const modalViolations = samples.surfaces.filter((sample) =>
        /text-command-help|industrial-modal/.test(sample.className)
        && (theme === 'light' ? isLightModeDarkFallback(sample) : isDarkModeLightLeak(sample)),
      );
      const badgeViolations = samples.badges.filter((sample) => isRoundedLegacyPill(sample.radiusPx));

      expect(modalViolations, `${theme}: Kurzbefehle-Dialog ist kein visueller Fremdkörper`).toEqual([]);
      expect(badgeViolations, `${theme}: Kurzbefehle-Dialog nutzt kantige Badges/Chips`).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });
});
