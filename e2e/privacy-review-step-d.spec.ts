import { test, expect } from './support/test';

function navigation(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Hauptnavigation' });
}

test('öffnet Datenschutz-Prüfdialog mit Kontext und dokumentiert Fortspeicherung', async ({ page }) => {
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
  await navigation(page).getByRole('button', { name: 'Fallakte', exact: true }).click();
  await expect(page.locator('[data-e2e="case-row-TEST-0003"]')).toBeVisible();
  await page.locator('[data-e2e="bulk-mark-closed-legacy"]').click();
  await expect(page.locator('#main-content').getByText('1 abgeschlossene Altakten wurden zur Datenschutzprüfung vorgemerkt.')).toBeVisible();
});

for (const scenario of [
  {
    option: 'anonymize_marked',
    optionName: 'Fallakte anonymisieren · nur vorgemerkte Freitexte',
    expectedMessage: 'Fallakte wurde anonymisiert (nur vorgemerkte Freitexte).',
    warning: 'Nicht vorgemerkte personenbezogene Angaben in Freitexten bleiben erhalten und müssen anschließend manuell geprüft werden.'
  },
  {
    option: 'anonymize_all',
    optionName: 'Fallakte anonymisieren · alle Freitexte ersetzen',
    expectedMessage: 'Fallakte wurde anonymisiert (alle Freitexte ersetzt).'
  }
] as const) {
  test(`überträgt den Fallanonymisierungsmodus ${scenario.option} bis zum Bridge-Aufruf`, async ({ page }) => {
      await navigation(page).getByRole('button', { name: 'Personen', exact: true }).click();
    await page.getByText('Mustermann, Max').click();
    await page.locator('[data-e2e="open-privacy-review-dialog"]').click();

    const dialog = page.getByRole('dialog', { name: 'Prüfung bei Zweckfortfall' });
    await dialog.getByLabel('Aktion').selectOption(scenario.option);
    await expect(dialog.getByLabel('Aktion')).toHaveValue(scenario.option);
    await expect(dialog.getByLabel('Aktion').locator('option:checked')).toHaveText(scenario.optionName);
    if ('warning' in scenario) await expect(dialog.getByText(scenario.warning)).toBeVisible();

    await dialog.getByLabel('Grund / Prüfbemerkung').fill('Anonymisierung im E2E-Vertrag.');
    await dialog.getByLabel('Bestätigung').fill('FALL ANONYMISIEREN');
    await dialog.getByRole('button', { name: 'Aktion dokumentieren' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('#main-content').getByText(scenario.expectedMessage)).toBeVisible();
  });
}
