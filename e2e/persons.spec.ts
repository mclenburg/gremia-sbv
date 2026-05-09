import { test, expect } from './support/test';

test('opens persons module and shows status expiry workflow without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await expect(page.getByRole('heading', { name: 'Personenverzeichnis' }).first()).toBeVisible();
  await expect(page.locator('[data-e2e="persons-workbench"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Personen importieren/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ablauf prüfen/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fristen als iCal/ })).toBeVisible();
  await expect(page.getByText('Mustermann, Max')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('guides CSV import through preview, mapping and validation', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await page.locator('[data-e2e="open-person-import-wizard"]').click();
  const dialog = page.locator('[data-e2e="person-import-wizard"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Personen importieren' })).toBeVisible();
  await dialog.getByText('Erweiterte Option: CSV direkt einfügen').click();
  await dialog.getByLabel('CSV-Daten').fill('Name;Status;Gültig bis\nImportperson, Ida;gleichgestellt;15.06.2026');
  await dialog.getByRole('button', { name: 'CSV-Vorschau erzeugen' }).click();

  await expect(dialog.getByRole('heading', { name: 'Vorschau aus eingefuegte-arbeitgeberliste.csv' })).toBeVisible();
  await expect(dialog.getByText('Importperson, Ida')).toBeVisible();
  await dialog.getByRole('button', { name: 'Weiter zum Spaltenmapping' }).click();

  await expect(dialog.getByRole('heading', { name: 'Spaltenmapping' })).toBeVisible();
  await expect(dialog.getByLabel('Vollname')).toHaveValue('Name');
  await expect(dialog.getByLabel('Personalnummer')).toHaveValue('');
  await dialog.getByRole('button', { name: 'Mapping prüfen' }).click();

  await expect(dialog.getByRole('heading', { name: 'Importprüfung' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(dialog.getByRole('heading', { name: 'Import abgeschlossen' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Importperson, Ida')).toBeVisible();
});
