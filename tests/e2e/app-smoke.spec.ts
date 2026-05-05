import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './support/test';

function packageVersion(): string {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
  return packageJson.version ?? '';
}

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('starts in an isolated synthetic E2E environment', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Gremia.SBV').first()).toBeVisible();
  await expect(page.getByLabel(/Gremia\.SBV Version/)).toContainText(packageVersion());
  await expect(mainNavigation(page).getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();

  const e2eInfo = await page.evaluate(() => window.__GREMIA_SBV_E2E);
  expect(e2eInfo.active).toBe(true);
  expect(e2eInfo.dataDir).toContain('gremia-sbv-e2e-');
});

test('opens the case workbench with synthetic test cases only', async ({ page }) => {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();

  const alphaRow = page.getByRole('row', { name: /TEST-0001\s+Testperson Alpha/ });
  await expect(alphaRow).toBeVisible();
  await expect(alphaRow.getByRole('cell', { name: 'Synthetischer E2E-Testfall ohne Echtdaten.' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'TEST-0001', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /TEST-0001\s*·\s*Testperson Alpha/ })).toBeVisible();
});
