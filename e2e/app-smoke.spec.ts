import { test, expect } from './support/test';

test('starts in an isolated synthetic E2E environment', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Gremia.SBV').first()).toBeVisible();
  await expect(page.getByLabel(/Gremia\.SBV Version/)).toContainText('0.8.8-g.2');
  await expect(page.getByRole('navigation').getByRole('button', { name: /Dashboard/ })).toBeVisible();

  const e2eInfo = await page.evaluate(() => window.__GREMIA_SBV_E2E);
  expect(e2eInfo.active).toBe(true);
  expect(e2eInfo.dataDir).toContain('gremia-sbv-e2e-');
});

test('opens the case workbench with synthetic test cases only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Fallakte/ }).click();

  await expect(page.getByText('TEST-0001')).toBeVisible();
  await expect(page.getByText('Testperson Alpha')).toBeVisible();
  await expect(page.getByText('Synthetischer E2E-Testfall ohne Echtdaten.')).toBeVisible();
});
