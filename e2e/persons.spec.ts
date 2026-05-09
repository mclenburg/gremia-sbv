import { test, expect } from './support/test';

test('opens persons module and shows status expiry workflow without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await expect(page.getByRole('heading', { name: 'Personenverzeichnis' }).first()).toBeVisible();
  await expect(page.locator('[data-e2e="persons-workbench"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Ablauf prüfen/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fristen als iCal/ })).toBeVisible();
  await expect(page.getByText('Mustermann, Max')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
