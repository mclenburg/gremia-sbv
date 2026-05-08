import type { Locator, Page } from '@playwright/test';
import { test, expect } from './support/test';

const viewports = [
  { width: 1280, height: 720, name: 'HD small' },
  { width: 1366, height: 768, name: 'Laptop common' },
  { width: 1440, height: 900, name: 'Laptop plus' },
  { width: 1920, height: 1080, name: 'Full HD' },
  { width: 2560, height: 1440, name: 'QHD' },
];

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

async function expectInViewport(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const viewport = locator.page().viewportSize();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

for (const viewport of viewports) {
  test(`keeps RC-critical layout stable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
    await expect(page.locator('[data-e2e="main-nav-cases"]')).toBeVisible();
    await expect(page.locator('[data-e2e="main-nav-compliance"]')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.locator('[data-e2e="main-nav-cases"]').click();
    await expect(page.locator('[data-e2e="case-row-TEST-0001"]')).toBeVisible();
    await expectInViewport(page.locator('[data-e2e="case-row-TEST-0001"]'));
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.locator('[data-e2e="main-nav-compliance"]').click();
    await expect(page.getByRole('heading', { name: /Compliance|Technischer Datenschutzstatus/i }).first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
}

test('keeps inline help dialog inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+H' : 'Control+H');

  const dialog = page.locator('[data-e2e="inline-help-dialog"]');
  await expect(dialog).toBeVisible();
  await expectInViewport(dialog);
  expect(await hasHorizontalOverflow(page)).toBe(false);
});
