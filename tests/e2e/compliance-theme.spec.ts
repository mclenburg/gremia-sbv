import type { Page } from '@playwright/test';
import { test, expect } from './support/test';

function parseRgb(value: string): number[] {
  const rgbMatch = value.match(/rgba?\(([-.\d]+),\s*([-.\d]+),\s*([-.\d]+)/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  const srgbMatch = value.match(/color\(srgb\s+([-.\d]+)\s+([-.\d]+)\s+([-.\d]+)/i);
  if (srgbMatch) {
    return [Number(srgbMatch[1]), Number(srgbMatch[2]), Number(srgbMatch[3])].map((part) =>
      part <= 1 ? Math.round(part * 255) : part,
    );
  }

  return [0, 0, 0];
}

function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

async function openComplianceFromNavigation(page: Page) {
  await mainNavigation(page).getByRole('button', { name: 'Compliance', exact: true }).click();
}

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('gremia.sbv.theme', value);
    window.localStorage.setItem('gremia-sbv-theme', value);
    document.documentElement.dataset.theme = value;
  }, theme);
}

async function effectiveBackgroundColor(page: Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate((element) => {
    function isTransparent(color: string): boolean {
      return color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || /rgba\([^)]*,\s*0\)/i.test(color);
    }

    let current: Element | null = element;
    while (current) {
      const color = getComputedStyle(current).backgroundColor;
      if (color && !isTransparent(color)) {
        return color;
      }
      current = current.parentElement;
    }

    const rootColor = getComputedStyle(document.documentElement).backgroundColor;
    if (rootColor && !isTransparent(rootColor)) {
      return rootColor;
    }

    return getComputedStyle(document.body).backgroundColor;
  });
}

test('keeps the compliance status area dark in dark mode', async ({ page }) => {
  await setTheme(page, 'dark');
  await page.goto('/');
  await openComplianceFromNavigation(page);

  const panel = page.locator('.compliance-status-panel').first();
  await expect(panel).toBeVisible();
  await expect(page.getByRole('heading', { name: /Technischer Datenschutzstatus/i })).toBeVisible();

  const background = await effectiveBackgroundColor(page, '.compliance-status-panel');
  const [r, g, b] = parseRgb(background);
  expect(r + g + b).toBeLessThan(420);
});

test('keeps compliance light mode light without dark fallback panels', async ({ page }) => {
  await setTheme(page, 'light');
  await page.goto('/');
  await openComplianceFromNavigation(page);

  const panel = page.locator('.compliance-status-panel').first();
  await expect(panel).toBeVisible();

  const background = await effectiveBackgroundColor(page, '.compliance-status-panel');
  const [r, g, b] = parseRgb(background);
  expect(r + g + b).toBeGreaterThan(520);
});
