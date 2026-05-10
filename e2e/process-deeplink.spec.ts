import { test, expect } from './support/test';

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('öffnet ein BEM-Verfahren aus dem Cockpit direkt in der richtigen Fallakte', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'BEM', exact: true }).click();

  await page.getByRole('button').filter({ hasText: 'TEST-0002' }).click();

  await expect(navigation(page).getByRole('button', { name: 'Fallakte', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /BEM-Verfahren/i })).toBeVisible();
  await expect(page.getByText('Synthetischer BEM-Anlass Beta.')).toBeVisible();
  await expect(page.locator('[data-e2e="case-row-TEST-0002"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-e2e="case-row-TEST-0001"]')).not.toHaveClass(/selected/);
});
