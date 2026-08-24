import { test, expect } from './support/test';

function mainNavigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('uses /zeit start-time suggestion without persisting before save', async ({ page }) => {
  await mainNavigation(page).getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Tätigkeitsjournal/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Tätigkeit erfassen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tätigkeit erfassen' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox', { name: 'Kurzbeschreibung / Kontext' }).fill('00:01');
  await expect(dialog.getByText(/Bis jetzt: 00:01-/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog.getByLabel('Zeitmodus')).toHaveValue('range');

  await dialog.getByRole('textbox', { name: 'Was wurde gemacht?' }).fill('E2E Tätigkeit ohne Echtdaten');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Tätigkeit wurde bewusst als SBV-Eigenaufzeichnung gespeichert/)).toBeVisible();
});
