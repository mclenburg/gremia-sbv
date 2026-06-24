import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('uses /zeit start-time suggestion without persisting before save', async ({ page }) => {
  await page.goto('/');
  await mainNavigation(page).getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Tätigkeitsjournal/i }).first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Kurzbeschreibung / Kontext' }).fill('00:01');
  await expect(page.getByText(/Bis jetzt: 00:01-/)).toBeVisible();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.getByLabel('Zeitmodus')).toHaveValue('range');

  await page.getByRole('textbox', { name: 'Was wurde gemacht?' }).fill('E2E Tätigkeit ohne Echtdaten');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText(/Tätigkeit wurde bewusst als SBV-Eigenaufzeichnung gespeichert/)).toBeVisible();
});
