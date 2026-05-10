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
  await expect(dialog.locator('[data-e2e="person-import-field-fullName"]')).toHaveValue('Name');
  await expect(dialog.locator('[data-e2e="person-import-field-personnelNumber"]')).toHaveValue('');
  await dialog.getByRole('button', { name: 'Mapping prüfen' }).click();

  await expect(dialog.getByRole('heading', { name: 'Importprüfung' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(dialog.getByRole('heading', { name: 'Import abgeschlossen' })).toBeVisible();
  await dialog.locator('[data-e2e="person-import-close-result"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Importperson, Ida')).toBeVisible();
});

test('legt Personen manuell ausschließlich im Modal-Overlay an und zeigt Auswahl rechts', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-persons"]').click();

  await page.getByText('Mustermann, Max').click();
  await expect(page.locator('.person-detail')).toContainText('Mustermann, Max');
  await expect(page.locator('.person-side-stack form[aria-labelledby="person-create-heading"]')).toHaveCount(0);

  await page.locator('[data-e2e="open-person-create-dialog"]').click();
  const dialog = page.locator('[data-e2e="person-create-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person anlegen' })).toBeVisible();
  await dialog.getByLabel('Vorname').fill('Mara');
  await dialog.getByLabel('Nachname').fill('Modal');
  await dialog.getByRole('button', { name: 'Person anlegen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Modal, Mara')).toBeVisible();
});

test('führt Personenanonymisierung über geschützten Modalpfad aus', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-persons"]').click();
  await page.getByText('Mustermann, Max').click();
  await page.locator('[data-e2e="open-person-anonymize-dialog"]').click();

  const dialog = page.locator('[data-e2e="person-anonymize-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person anonymisieren' })).toBeVisible();
  await dialog.getByLabel('Grund').fill('Status dauerhaft entfallen, weitere personenbezogene Speicherung nicht erforderlich.');
  await dialog.getByLabel('Bestätigung').fill('PERSON ANONYMISIEREN');
  await dialog.getByRole('button', { name: 'Person anonymisieren' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('#main-content').getByText('Person wurde anonymisiert. Verbundene Fallakten benötigen Datenschutzprüfung.')).toBeVisible();
});

test('führt Personenlöschung über geschützten Modalpfad aus', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-e2e="main-nav-persons"]').click();
  await page.getByText('Mustermann, Max').click();
  await page.getByRole('button', { name: /Person löschen: Mustermann, Max/ }).click();

  const dialog = page.locator('[data-e2e="person-delete-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Person löschen' })).toBeVisible();
  await dialog.getByLabel('Grund').fill('Löschgrund nach abgeschlossener Prüfung dokumentiert.');
  await dialog.getByLabel('Bestätigung').fill('PERSON LÖSCHEN');
  await dialog.getByRole('button', { name: 'Person löschen' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('#main-content').getByText('Person wurde gelöscht. Verbundene Fallakten benötigen Datenschutzprüfung.')).toBeVisible();
  await expect(page.getByText('Mustermann, Max')).toHaveCount(0);
});
