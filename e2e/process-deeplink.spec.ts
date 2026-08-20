import { test, expect } from './support/test';

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('führt BEM ohne eigenes Cockpit über die führende Fallakte', async ({ page }) => {
  await expect(navigation(page).getByRole('button', { name: 'BEM', exact: true })).toHaveCount(0);
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await page.locator('[data-e2e="case-row-TEST-0002"]').click();
  await page.locator('.case-tree-node').filter({ hasText: /^BEM/u }).click();

  await expect(navigation(page).getByRole('button', { name: 'Fallakte', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /BEM-Verfahren/i })).toBeVisible();
  await expect(page.getByText('Synthetischer BEM-Anlass Beta.')).toBeVisible();
  await expect(page.locator('[data-e2e="case-row-TEST-0002"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-e2e="case-row-TEST-0001"]')).not.toHaveClass(/selected/);
});
