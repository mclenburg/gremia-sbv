import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('creates participation violation only after explicit context and announces validation feedback', async ({ page }) => {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Verstöße', exact: true }).click();

  await expect(page.getByRole('heading', { name: /Beteiligungsverstöße/i }).first()).toBeVisible();
  await expect(page.getByLabel('Ausgangskontext')).toHaveValue('case_measure_participation');
  await expect(page.getByLabel('Fall allgemein wählen')).toBeDisabled();

  await page.getByRole('button', { name: /Verstoß bewusst speichern/ }).click();
  await expect(
    page.locator('.industrial-message-warning').filter({ hasText: /Bitte zuerst den Ausgangskontext eindeutig festlegen/ }),
  ).toBeVisible();
  await expect(page.locator('.industrial-live-region[role="alert"]').filter({ hasText: /Ausgangskontext/ })).toBeVisible();

  await page.getByLabel('Maßnahmen-ID').fill('measure-participation-e2e-0002');
  await page.getByLabel('Betreff').fill('E2E Beteiligungsverstoß mit case_measure_participation');
  await page.getByLabel('Maßnahme / Sachverhalt').fill('Synthetischer Beteiligungsvorgang ohne Echtdaten.');
  await page.getByLabel('Was war falsch?').fill('Die Unterrichtung war unvollständig.');
  await page.getByRole('button', { name: /Verstoß bewusst speichern/ }).click();

  await expect(page.locator('.industrial-live-region[role="status"]')).toContainText('Beteiligungsverstoß wurde protokolliert.');
  await expect(page.getByRole('table', { name: 'Beteiligungsverstöße' })).toContainText('E2E Beteiligungsverstoß mit case_measure_participation');
});
