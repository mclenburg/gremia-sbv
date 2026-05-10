import { test, expect } from './support/test';

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('öffnet Datenschutz-Prüfdialog mit Kontext und dokumentiert Fortspeicherung', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Personen', exact: true }).click();
  await page.getByText('Mustermann, Max').click();
  await page.locator('[data-e2e="open-privacy-review-dialog"]').click();

  const dialog = page.getByRole('dialog', { name: 'Prüfung bei Zweckfortfall' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Personenstatus')).toBeVisible();
  await expect(dialog.getByText('Offene Fristen')).toBeVisible();
  await expect(dialog.getByText('Laufende Maßnahmen')).toBeVisible();
  await expect(dialog.getByText('Freitextprüfung')).toBeVisible();

  await dialog.getByLabel('Aktion').selectOption('retention');
  await dialog.getByLabel('Grund / Prüfbemerkung').fill('Laufendes Beteiligungsverfahren, erneute Prüfung erforderlich.');
  await dialog.getByLabel('Erneut prüfen am').fill('2026-07-01');
  await dialog.getByRole('button', { name: 'Aktion dokumentieren' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#main-content').getByText('Fortspeicherung wurde dokumentiert.')).toBeVisible();
});

test('markiert abgeschlossene Altakten per Bulk-Aktion zur Datenschutzprüfung', async ({ page }) => {
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.locator('[data-e2e="case-row-TEST-0003"]')).toBeVisible();
  await page.locator('[data-e2e="bulk-mark-closed-legacy"]').click();
  await expect(page.locator('#main-content').getByText('1 abgeschlossene Altakten wurden zur Datenschutzprüfung vorgemerkt.')).toBeVisible();
});
